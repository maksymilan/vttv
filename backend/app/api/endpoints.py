from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import shutil
import uuid
import os
from app.config import settings
from app.service.video_llm import video_llm
from app.service.video_producer import render_final_video
from app.core.rag_engine import rag_engine

router = APIRouter()

@APIRouter(prefix="/api")

@router.post("/refresh_rag")
async def refresh_rag():
    """手动触发 RAG 知识库更新 (如果替换了 PDF)"""
    try:
        rag_engine.initialize_knowledge_base()
        return {"status": "success", "message": "知识库已重新加载"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_video(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    session_path = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)
    
    # 保存上传的视频
    input_video_path = os.path.join(session_path, "input.mp4")
    with open(input_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # 1. 视频理解 + RAG查询 + 脚本生成
        # 注意：这里不需要手动调 RAG，process_video_pipeline 内部会调用 rag_engine.query
        script_json = video_llm.process_video_pipeline(input_video_path)
        
        # 2. 视频渲染
        output_path = await render_final_video(script_json, session_id)
        
        return {"status": "success", "download_url": f"/api/download/{session_id}"}
        
    except Exception as e:
        # 打印错误堆栈以便调试
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{session_id}")
async def download_video(session_id: str):
    file_path = os.path.join(settings.TEMP_DIR, session_id, "final_output.mp4")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Video not found")