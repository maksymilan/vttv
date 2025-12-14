import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    API_KEY = os.getenv("AIHUBMIX_API_KEY")
    BASE_URL = os.getenv("AIHUBMIX_BASE_URL")
    # 用于 Embedding 的 OpenAI 兼容地址
    OPENAI_BASE_URL = "https://aihubmix.com/v1"
    # 用于 视频理解 的 Google GenAI 地址 (通常兼容 OpenAI 格式或独立)
    # 根据你提供的代码，Google GenAI client 使用了特定的 base_url
    GOOGLE_GENAI_BASE_URL = "https://aihubmix.com/gemini"
    
    # 路径配置
    DATA_DIR = os.path.join(os.getcwd(), "data")
    TEMP_DIR = os.path.join(os.getcwd(), "temp")
    VECTOR_DB_DIR = os.path.join(DATA_DIR, "chroma_db")
    PDF_PATH = os.path.join(DATA_DIR, "knowledge.pdf")

settings = Settings()

# 确保目录存在
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.TEMP_DIR, exist_ok=True)