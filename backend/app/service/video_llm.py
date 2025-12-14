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
        # 使用 gemini-2.0-flash 或 gemini-3-pro-preview
        self.model_name = "gemini-2.0-flash" 

    def process_video_pipeline(self, video_path: str):
        # 1. 读取视频二进制
        print("[INFO] 读取视频文件...")
        with open(video_path, "rb") as f:
            video_bytes = f.read()

        # 2. 视频理解 (Video -> Text)
        print("[INFO] 调用模型进行视频理解...")
        analyze_prompt = "请详细分析这个视频中的康复动作。识别动作名称，并分步骤描述动作细节、身体姿态和发力点。请直接输出客观描述。"
        
        response = self.client.models.generate_content(
            model=self.model_name,
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
        print(f"[INFO] 初步识别结果: {raw_description[:50]}...")

        # 3. RAG 检索增强
        print("[INFO] 查询 RAG 知识库...")
        rag_context = rag_engine.query(raw_description)

        # 4. 生成最终脚本 (Text + Context -> JSON)
        print("[INFO] 生成最终演示脚本...")
        final_prompt = f"""
        基于动作描述和专业知识，生成教学视频的幻灯片脚本。

        [动作描述]: {raw_description}
        [专业知识库]: {rag_context}

        请输出严格的 JSON 格式，不要包含 Markdown 代码块标记（如 ```json）。格式如下：
        {{
            "slides": [
                {{
                    "title": "标题",
                    "bullets": ["要点1", "要点2"],
                    "narration": "详细的口语讲解词"
                }}
            ]
        }}
        """

        script_response = self.client.models.generate_content(
            model=self.model_name,
            contents=types.Content(parts=[types.Part(text=final_prompt)]),
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        return json.loads(script_response.text)

video_llm = VideoLLMService()