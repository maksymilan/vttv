import os
import shutil
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from app.service.custom_embedding import AiHubMixEmbeddings
from app.config import settings

class RAGEngine:
    def __init__(self):
        self.embedding_model = AiHubMixEmbeddings()
        self.vector_store = None

    def initialize_knowledge_base(self):
        """初始化知识库：如果向量库存在则加载，否则处理PDF"""
        if os.path.exists(settings.VECTOR_DB_DIR) and os.listdir(settings.VECTOR_DB_DIR):
            print("[INFO] 检测到现有向量数据库，正在加载...")
            self.vector_store = Chroma(
                persist_directory=settings.VECTOR_DB_DIR,
                embedding_function=self.embedding_model
            )
        else:
            print("[INFO] 向量数据库为空，正在初始化...")
            self._ingest_pdf()

    def _ingest_pdf(self):
        """内部方法：读取PDF并构建索引"""
        if not os.path.exists(settings.PDF_PATH):
            print(f"[WARNING] 未找到 PDF 文件: {settings.PDF_PATH}，跳过 RAG 初始化。")
            return

        print(f"[INFO] 正在处理 PDF: {settings.PDF_PATH}")
        loader = PyPDFLoader(settings.PDF_PATH)
        docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(docs)

        self.vector_store = Chroma.from_documents(
            documents=splits,
            embedding=self.embedding_model,
            persist_directory=settings.VECTOR_DB_DIR
        )
        print(f"[INFO] PDF 索引构建完成，共 {len(splits)} 个切片。")

    def query(self, query_text: str, k=3):
        """查询接口"""
        if not self.vector_store:
            # 尝试重新加载
            self.initialize_knowledge_base()
            if not self.vector_store:
                return "知识库未初始化或PDF文件不存在。"
        
        results = self.vector_store.similarity_search(query_text, k=k)
        return "\n".join([doc.page_content for doc in results])

# 全局单例
rag_engine = RAGEngine()