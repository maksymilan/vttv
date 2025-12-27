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
        script_json = video_llm.process_video_pipeline(input_video_path)
        
        # 2. 视频渲染
        output_path = await render_final_video(script_json, session_id)
        
        return {"status": "success", "download_url": f"/api/download/{session_id}"}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{session_id}")
async def download_video(session_id: str):
    file_path = os.path.join(settings.TEMP_DIR, session_id, "final_output.mp4")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Video not found")