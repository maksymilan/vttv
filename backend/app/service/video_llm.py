import json
from google import genai
from google.genai import types
from app.config import settings
from app.core.rag_engine import rag_engine

class VideoLLMService:
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.API_KEY,
            http_options={"base_url": settings.GOOGLE_GENAI_BASE_URL}
        )
        # 使用 gemini-2.0-flash 或 gemini-1.5-pro
        self.model_name = "gemini-2.0-flash" 

    def chat(self, message: str, history: list = None, model_name: str = "gemini-2.0-flash", stream: bool = False):
        """
        普通 AI 对话功能
        Role: 康复训练指导
        支持流式输出
        """
        print(f"[INFO] 💬 收到用户消息: {message[:50]}{'...' if len(message) > 50 else ''}")
        print(f"[INFO] 🤖 使用模型: {model_name}")
        print(f"[INFO] 📚 历史消息数: {len(history) if history else 0}")
        print(f"[INFO] ⚡ 流式输出: {'是' if stream else '否'}")
        
        system_instruction = """
        你是一名专业的康复训练指导教练。你的职责是：
        1. 以专业、亲切、鼓励的口吻与用户交流。
        2. 解答用户关于康复动作、身体恢复、运动健康方面的问题。
        3. 在回答时，尽量清晰明确，避免过于晦涩的医学术语，确保用户能听懂。
        4. 适当地与用户互动，例如询问他们目前的疼痛程度、康复进展或具体需求。
        5. 如果用户上传了视频（通过上下文得知），请结合视频内容进行指导。
        """
        
        # 构建对话历史
        contents = []
        if history:
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                # 过滤掉非文本内容（如视频占位符）
                if isinstance(msg["content"], str) and not msg["content"].startswith("[系统"):
                     contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        
        contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

        print(f"[INFO] 🚀 开始调用 Gemini API...")
        
        if stream:
            # 流式返回生成器
            print(f"[INFO] 📡 使用流式模式生成回复")
            return self.client.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
        else:
            # 非流式返回完整文本
            response = self.client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            response_text = response.text
            print(f"[INFO] ✅ API 调用成功，响应长度: {len(response_text)} 字符")
            print(f"[INFO] 📄 响应预览: {response_text[:100]}{'...' if len(response_text) > 100 else ''}")
            return response_text

    def process_video_pipeline(self, video_path: str, user_prompt: str = None, progress_callback=None, model_name: str = "gemini-3-pro-preview"):
        def log(msg):
            print(f"[INFO] {msg}")
            if progress_callback:
                progress_callback(msg)

        # 1. 读取视频二进制
        log("正在读取视频文件...")
        with open(video_path, "rb") as f:
            video_bytes = f.read()

        # 2. 视频理解 (Video -> Text)
        log(f"正在调用模型 ({model_name}) 进行视频理解，分析康复动作...")
        
        base_analyze_prompt = """
        你是一名专业的康复训练专家。请详细分析这个视频中的康复动作。
        1. 识别具体的动作名称。
        2. 分步骤描述动作细节、身体姿态、发力点以及注意事项。
        3. 指出动作中可能存在的错误或需要改进的地方（如果有）。
        4. 语气要专业且具有指导性。
        """
        
        if user_prompt:
            analyze_prompt = f"{base_analyze_prompt}\n\n用户特别关注点/额外指令：{user_prompt}\n请在分析时重点结合用户的指令进行回答。"
        else:
            analyze_prompt = base_analyze_prompt
        
        response = self.client.models.generate_content(
            model=model_name,
            contents=types.Content(
                parts=[
                    types.Part(
                        inline_data=types.Blob(
                            data=video_bytes,
                            mime_type="video/mp4"
                        )
                    ),
                    types.Part(text=analyze_prompt)
                ]
            )
        )
        raw_description = response.text
        log(f"初步识别完成: {raw_description[:30]}...")

        # 3. RAG 检索增强
        log("正在查询 RAG 知识库，获取相关专业建议...")
        rag_context = rag_engine.query(raw_description)

        # 4. 生成最终脚本 (Text + Context -> JSON)
        log("正在生成最终的教学演示脚本...")
        
        final_prompt_template = f"""
        你是一名康复训练指导。基于视频的动作描述和检索到的专业知识，生成一份简洁的教学视频脚本。

        [动作描述]: {raw_description}
        [专业知识库]: {rag_context}
        """
        
        if user_prompt:
            final_prompt_template += f"\n[用户额外指令]: {user_prompt}\n请确保生成的脚本内容回应了用户的指令。"

        final_prompt_template += """
        
        请输出严格的 JSON 格式（不要包含 ```json 标记）。生成5-8页幻灯片，每页内容要详细充实，格式如下：
        {
            "slides": [
                {
                    "title": "幻灯片标题",
                    "bullets": ["要点1（详细描述）", "要点2（详细描述）", "要点3（详细描述）", "要点4（详细描述）"],
                    "narration": "详细的讲解词，每页3-5句话，需要包含：动作要领、注意事项、常见错误等。讲解要生动、专业且易懂。"
                }
            ]
        }
        
        要求：
        1. 每页幻灯片至少包含3-5个要点
        2. 每个要点要详细具体，不要太简略
        3. 讲解词要充分展开，每页至少50-100字
        4. 内容要覆盖：动作准备、执行步骤、注意事项、常见错误、效果说明等多个维度
        5. 语言要专业但通俗易懂，适合患者理解
        """
        
        final_prompt = final_prompt_template

        try:
            log("正在调用模型生成脚本...")
            script_response = self.client.models.generate_content(
                model=model_name,
                contents=types.Content(parts=[types.Part(text=final_prompt)]),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                    max_output_tokens=4096  # 增加到4096以支持更长内容
                )
            )
            log("脚本生成成功，正在解析 JSON...")
            script_data = json.loads(script_response.text)
            log(f"脚本解析完成，共 {len(script_data.get('slides', []))} 页幻灯片")
            return script_data, raw_description
        except json.JSONDecodeError as e:
            log(f"JSON 解析错误: {str(e)}")
            log(f"原始响应: {script_response.text[:200]}")
            # 返回一个默认的脚本
            default_script = {
                "slides": [
                    {
                        "title": "康复动作分析",
                        "bullets": ["视频已分析完成", "请查看详细文字分析"],
                        "narration": "视频分析已完成，详细信息请参考文字描述。"
                    }
                ]
            }
            return default_script, raw_description
        except Exception as e:
            log(f"生成脚本时出错: {str(e)}")
            # 返回一个默认的脚本
            default_script = {
                "slides": [
                    {
                        "title": "康复动作分析",
                        "bullets": ["视频已分析完成", "请查看详细文字分析"],
                        "narration": "视频分析已完成，详细信息请参考文字描述。"
                    }
                ]
            }
            return default_script, raw_description

    def generate_session_title(self, first_message: str, model_name: str = "gemini-2.0-flash"):
        """
        基于对话的第一条消息，生成简洁的会话标题
        """
        prompt = f"""
        请为以下对话生成一个简洁的标题（不超过15个字）。
        标题要能概括对话的主要内容，使用专业但易懂的语言。
        
        对话内容：{first_message}
        
        只返回标题文本，不要包含引号、标点或其他说明。
        示例格式：
        - 腰椎康复动作分析
        - 膝关节疼痛咨询
        - 核心肌群训练指导
        """
        
        try:
            response = self.client.models.generate_content(
                model=model_name,
                contents=types.Content(parts=[types.Part(text=prompt)]),
                config=types.GenerateContentConfig(
                    temperature=0.3,  # 较低的温度以获得更稳定的结果
                    max_output_tokens=50
                )
            )
            title = response.text.strip()
            # 移除可能的引号
            title = title.strip('"').strip("'").strip('《》')
            # 限制长度
            if len(title) > 20:
                title = title[:20] + "..."
            return title
        except Exception as e:
            print(f"[WARN] 生成标题失败: {e}")
            # 返回默认标题
            return first_message[:15] + ("..." if len(first_message) > 15 else "")

video_llm = VideoLLMService()