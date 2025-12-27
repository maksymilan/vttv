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
        """系统启动时：总是尝试加载现有的向量数据库"""
        # 无论是否存在数据，都初始化 Chroma 对象指向同一目录
        # 这样如果目录里有数据会自动加载，没有数据则会在第一次添加时创建
        print(f"[INFO] 正在加载向量数据库: {settings.VECTOR_DB_DIR}")
        self.vector_store = Chroma(
            persist_directory=settings.VECTOR_DB_DIR,
            embedding_function=self.embedding_model
        )
        
        # 如果数据库为空且存在默认 PDF，则加载默认 PDF
        if not os.path.exists(settings.VECTOR_DB_DIR) and os.path.exists(settings.PDF_PATH):
            self.add_pdf(settings.PDF_PATH)

    def add_pdf(self, file_path: str):
        """增量添加 PDF 到知识库"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        print(f"[INFO] 正在处理并添加 PDF: {file_path}")
        
        # 1. 加载与切分
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        # 使用较小的 chunk_size 以适应多文档检索的精度
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(docs)

        if not splits:
            print("[WARNING] PDF 内容为空或无法提取文本")
            return

        # 2. 确保 vector_store 已初始化
        if self.vector_store is None:
            self.initialize_knowledge_base()

        # 3. 增量添加到数据库 (使用 add_documents 而不是 from_documents)
        self.vector_store.add_documents(documents=splits)
        
        print(f"[INFO] 成功添加文档，新增切片数: {len(splits)}")

    def query(self, query_text: str, k=3):
        """查询接口"""
        if not self.vector_store:
            self.initialize_knowledge_base()
            
        # 检查数据库是否真的有数据（避免空库报错）
        try:
            if not self.vector_store.get()['ids']:
                return "知识库为空，请先上传 PDF 文档。"
        except:
            return "知识库未初始化。"

        print(f"[INFO] RAG 检索: {query_text}")
        results = self.vector_store.similarity_search(query_text, k=k)
        return "\n".join([doc.page_content for doc in results])

# 全局单例
rag_engine = RAGEngine()