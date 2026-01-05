from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, Form, Body
from fastapi.responses import FileResponse
import shutil
import uuid
import os
import asyncio
import json
from typing import List, Dict
from app.config import settings
from app.service.video_llm import video_llm
from app.service.video_producer import render_final_video
from app.core.rag_engine import rag_engine
from app.service.example_video_index import ExampleVideoIndex

router = APIRouter()

# 初始化范例视频索引
example_video_index = ExampleVideoIndex(settings.EXAMPLE_VIDEO_DIR)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.message_queue: Dict[str, List[dict]] = {}  # 消息队列，用于存储离线消息

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        
        # 如果有离线消息，连接后立即发送
        if client_id in self.message_queue and self.message_queue[client_id]:
            print(f"[INFO] 📨 发送 {len(self.message_queue[client_id])} 条离线消息给 {client_id}")
            for msg in self.message_queue[client_id]:
                await websocket.send_json(msg)
            # 清空队列
            self.message_queue[client_id] = []

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_json(self, data: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(data)
            except Exception as e:
                print(f"[WARNING] 发送消息失败，客户端可能已断开: {e}")
                self.disconnect(client_id)
                # 发送失败也存入队列
                if client_id not in self.message_queue:
                    self.message_queue[client_id] = []
                self.message_queue[client_id].append(data)
        else:
            # 客户端不在线，存入消息队列
            print(f"[INFO] 📥 客户端 {client_id} 不在线，消息存入队列")
            if client_id not in self.message_queue:
                self.message_queue[client_id] = []
            self.message_queue[client_id].append(data)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    print(f"[INFO] 🔌 WebSocket 连接建立: client_id={client_id}")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                if message_data.get("type") == "chat":
                    user_message = message_data.get("message")
                    history = message_data.get("history", [])
                    model_name = message_data.get("model", "gemini-3-pro-preview")
                    use_stream = message_data.get("stream", True)  # 默认使用流式输出
                    
                    print(f"[INFO] 📨 收到聊天请求 - 用户: {user_message[:30]}...")
                    print(f"[INFO] 📊 消息统计 - 历史: {len(history)} 条, 模型: {model_name}, 流式: {use_stream}")
                    
                    # 发送开始状态
                    await manager.send_json({
                        "type": "chat_start",
                        "message": "AI 正在思考..."
                    }, client_id)
                    
                    if use_stream:
                        # 流式输出
                        print(f"[INFO] 🌊 开始流式生成回复...")
                        import time
                        import asyncio
                        stream_response = video_llm.chat(user_message, history, model_name=model_name, stream=True)
                        full_text = ""
                        chunk_count = 0
                        
                        for chunk in stream_response:
                            if hasattr(chunk, 'text') and chunk.text:
                                full_text += chunk.text
                                chunk_count += 1
                                
                                # 记录时间戳
                                timestamp = time.time()
                                print(f"[INFO] 📡 [{timestamp}] 发送片段 #{chunk_count}, chunk长度: {len(chunk.text)}, 总长度: {len(full_text)}")
                                
                                # 发送流式片段
                                await manager.send_json({
                                    "type": "chat_stream",
                                    "chunk": chunk.text,
                                    "full_text": full_text
                                }, client_id)
                                
                                # 添加延迟，让前端有时间渲染每个片段（100ms）
                                await asyncio.sleep(0.1)
                        
                        print(f"[INFO] ✅ 流式输出完成 - 共 {chunk_count} 个片段, 总长度: {len(full_text)} 字符")
                        
                        # 发送完成状态
                        await manager.send_json({
                            "type": "chat_response",
                            "message": full_text,
                            "is_complete": True
                        }, client_id)
                    else:
                        # 非流式输出（一次性返回）
                        print(f"[INFO] 📦 使用非流式模式...")
                        response_text = video_llm.chat(user_message, history, model_name=model_name, stream=False)
                        
                        await manager.send_json({
                            "type": "chat_response",
                            "message": response_text
                        }, client_id)
                        
            except json.JSONDecodeError:
                print(f"[ERROR] ❌ JSON 解析失败")
                pass
            except Exception as e:
                print(f"[ERROR] ❌ 聊天处理异常: {str(e)}")
                import traceback
                traceback.print_exc()
                await manager.send_json({
                    "type": "error",
                    "message": f"Chat error: {str(e)}"
                }, client_id)
    except WebSocketDisconnect:
        print(f"[INFO] 🔌 WebSocket 连接断开: client_id={client_id}")
        manager.disconnect(client_id)

@router.post("/add_knowledge")
async def add_knowledge(file: UploadFile = File(...)):
    """上传新的 PDF 到知识库 (增量更新)"""
    try:
        # 1. 保存文件到 data 目录
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(settings.DATA_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. 调用引擎添加到向量库
        rag_engine.add_pdf(file_path)
        
        return {
            "status": "success", 
            "message": f"文档 '{file.filename}' 已成功加入知识库，语料库已扩大。"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh_rag")
async def refresh_rag():
    """(可选) 重新加载数据库连接"""
    try:
        rag_engine.initialize_knowledge_base()
        return {"status": "success", "message": "知识库连接已刷新"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process_video_task(file_path: str, session_path: str, client_id: str, loop: asyncio.AbstractEventLoop, prompt: str = None, model_name: str = "gemini-3-pro-preview"):
    try:
        def progress_callback(msg):
            asyncio.run_coroutine_threadsafe(
                manager.send_json({"type": "progress", "message": msg}, client_id),
                loop
            )

        # 1. LLM Pipeline
        progress_callback("正在分析视频...")
        script_data, text_analysis = video_llm.process_video_pipeline(file_path, user_prompt=prompt, progress_callback=progress_callback, model_name=model_name)
        
        # 2. Render Video
        progress_callback("开始制作演示视频...")
        session_id = os.path.basename(session_path)
        output_filename = "final_output.mp4"
        
        # 使用 asyncio.run_coroutine_threadsafe 来运行异步函数，并传递 progress_callback
        future = asyncio.run_coroutine_threadsafe(
            render_final_video(script_data, session_id, progress_callback),
            loop
        )
        # 等待视频渲染完成
        future.result()
        
        progress_callback("视频生成完成！")
        
        download_url = f"/api/download/{session_id}/{output_filename}"
        
        # 搜索相关的范例视频
        example_videos = []
        try:
            progress_callback("正在匹配相关范例视频...")
            
            # 确保索引已加载
            if not example_video_index.video_index:
                example_video_index.load_index()
            
            all_videos = example_video_index.video_index
            
            # 1. 尝试使用 LLM 进行智能推荐
            recommended_ids = video_llm.recommend_videos(text_analysis, all_videos)
            
            if recommended_ids:
                print(f"[INFO] 🎯 LLM 推荐了 {len(recommended_ids)} 个视频")
                for vid in recommended_ids:
                    video = next((v for v in all_videos if v['filename'] == vid), None)
                    if video:
                        example_videos.append({
                            "filename": video["filename"],
                            "category": video["category"],
                            "tags": video["tags"],
                            "download_url": f"/api/example-video/{video['relative_path']}",
                            "relevance_score": 90  # LLM 推荐的高置信度
                        })
            
            # 2. 如果 LLM 推荐不足 3 个，使用关键词搜索补充
            if len(example_videos) < 3:
                print("[INFO] 🔍 补充关键词搜索结果...")
                search_query = text_analysis if text_analysis else ""
                if prompt:
                    search_query += " " + prompt
                
                # 排除已经推荐的视频
                existing_ids = {v['filename'] for v in example_videos}
                
                keyword_results = example_video_index.search_videos(search_query, max_results=5)
                
                for video in keyword_results:
                    if video['filename'] not in existing_ids:
                        example_videos.append({
                            "filename": video["filename"],
                            "category": video["category"],
                            "tags": video["tags"],
                            "download_url": f"/api/example-video/{video['relative_path']}",
                            "relevance_score": video.get("relevance_score", 0)
                        })
                        if len(example_videos) >= 5:
                            break
                            
        except Exception as e:
            print(f"[WARNING] 搜索范例视频失败: {e}")
            import traceback
            traceback.print_exc()
        
        asyncio.run_coroutine_threadsafe(
            manager.send_json({
                "type": "complete",
                "download_url": download_url,
                "text_analysis": text_analysis,
                "example_videos": example_videos
            }, client_id),
            loop
        )
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        
        # 针对 Edge TTS 错误提供更友好的提示
        if "503" in error_msg or "WSServerHandshakeError" in error_msg:
            error_msg = "语音合成服务暂时不可用，请稍后重试"
        elif "edge_tts" in error_msg.lower() or "tts" in error_msg.lower():
            error_msg = f"语音生成失败: {error_msg}"
        else:
            error_msg = f"视频生成失败: {error_msg}"
            
        print(f"[ERROR] {error_msg}")
        traceback.print_exc()
        asyncio.run_coroutine_threadsafe(
            manager.send_json({
                "type": "error",
                "message": error_msg
            }, client_id),
            loop
        )

@router.post("/upload-user-video")
async def upload_user_video(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """上传用户视频并返回永久URL（用于消息列表显示）"""
    session_path = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)
    
    filename = f"user_upload_{file.filename}"
    file_path = os.path.join(session_path, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    download_url = f"/api/download/{session_id}/{filename}"
    return {"download_url": download_url, "filename": filename}

@router.post("/generate")
async def generate_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    client_id: str = Form(...),
    prompt: str = Form(None),
    model: str = Form("gemini-3-pro-preview")
):
    session_id = str(uuid.uuid4())
    session_path = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)
    
    filename = f"input_{file.filename}"
    file_path = os.path.join(session_path, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    loop = asyncio.get_running_loop()
    background_tasks.add_task(process_video_task, file_path, session_path, client_id, loop, prompt, model)
    
    return {"status": "processing", "session_id": session_id}

@router.post("/generate-title")
async def generate_title(request: dict = Body(...)):
    """为对话会话生成智能标题"""
    try:
        first_message = request.get("message", "")
        model_name = request.get("model", "gemini-2.0-flash")
        
        if not first_message:
            return {"title": "新对话"}
        
        title = video_llm.generate_session_title(first_message, model_name)
        return {"title": title}
    except Exception as e:
        print(f"[ERROR] 生成标题失败: {e}")
        return {"title": first_message[:15] + ("..." if len(first_message) > 15 else "")}

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
):
    """上传 PDF 文档到知识库"""
    try:
        # 验证文件类型
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="只支持 PDF 文件")
        
        # 创建临时目录
        pdf_upload_dir = os.path.join(settings.DATA_DIR, "uploaded_pdfs")
        os.makedirs(pdf_upload_dir, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(pdf_upload_dir, file.filename)
        
        # 如果文件已存在，添加时间戳
        if os.path.exists(file_path):
            import time
            timestamp = int(time.time())
            name, ext = os.path.splitext(file.filename)
            file_path = os.path.join(pdf_upload_dir, f"{name}_{timestamp}{ext}")
        
        print(f"[INFO] 📄 正在保存 PDF: {file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 添加到知识库
        print(f"[INFO] 📚 正在添加到知识库...")
        rag_engine.add_pdf(file_path)
        
        print(f"[INFO] ✅ PDF 已成功添加到知识库: {file.filename}")
        return {
            "status": "success",
            "message": f"文档 {file.filename} 已成功添加到知识库",
            "filename": file.filename,
            "path": file_path
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@router.get("/download/{session_id}/{filename}")
async def download_file(session_id: str, filename: str):
    file_path = os.path.join(settings.TEMP_DIR, session_id, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

@router.get("/example-video/{video_path:path}")
async def get_example_video(video_path: str):
    """获取范例视频文件"""
    file_path = os.path.join(settings.EXAMPLE_VIDEO_DIR, video_path)
    if os.path.exists(file_path) and file_path.endswith('.mp4'):
        return FileResponse(file_path, media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Example video not found")

@router.get("/example-videos/search")
async def search_example_videos(query: str, max_results: int = 5):
    """搜索范例视频"""
    try:
        results = example_video_index.search_videos(query, max_results)
        # 添加下载URL
        for video in results:
            video["download_url"] = f"/api/example-video/{video['relative_path']}"
        return {
            "status": "success",
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

@router.get("/example-videos/categories")
async def get_example_categories():
    """获取所有范例视频分类"""
    try:
        categories = example_video_index.get_all_categories()
        return {
            "status": "success",
            "categories": categories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分类失败: {str(e)}")

@router.get("/example-videos/statistics")
async def get_example_statistics():
    """获取范例视频统计信息"""
    try:
        stats = example_video_index.get_statistics()
        return {
            "status": "success",
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

@router.post("/example-videos/rebuild-index")
async def rebuild_example_index():
    """重新构建范例视频索引"""
    try:
        index = example_video_index.build_index()
        return {
            "status": "success",
            "message": f"索引重建完成，共找到 {len(index)} 个视频",
            "total": len(index)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重建索引失败: {str(e)}")