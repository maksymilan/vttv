from typing import List
from langchain_core.embeddings import Embeddings
import openai
from app.config import settings

class AiHubMixEmbeddings(Embeddings):
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=settings.API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            timeout=60.0, 
            max_retries=3
        )
        # 使用 Gemini 嵌入模型
        self.model = "gemini-embedding-001"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """对文档列表进行向量化"""
        # 为了避免超长，简单的逐个处理，生产环境可以使用 batch
        embeddings = []
        for text in texts:
            # 替换换行符以优化准确性
            text = text.replace("\n", " ")
            response = self.client.embeddings.create(
                input=text,
                model=self.model
            )
            embeddings.append(response.data[0].embedding)
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        """对单个查询进行向量化"""
        text = text.replace("\n", " ")
        response = self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding