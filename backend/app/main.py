from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.endpoints import router, example_video_index
from app.core.rag_engine import rag_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行：初始化知识库
    print("[SYSTEM] 系统启动，正在检查 RAG 知识库...")
    rag_engine.initialize_knowledge_base()
    
    # 初始化范例视频索引
    print("[SYSTEM] 正在加载范例视频索引...")
    if not example_video_index.load_index():
        print("[SYSTEM] 索引文件不存在，开始构建索引...")
        example_video_index.build_index()
    else:
        stats = example_video_index.get_statistics()
        print(f"[SYSTEM] ✅ 范例视频索引加载完成 - 共 {stats['total_videos']} 个视频")
    
    yield
    # 关闭时执行
    print("[SYSTEM] 系统关闭")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)