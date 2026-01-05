import os
import json
import shutil
import time
import sys

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google import genai
from google.genai import types
from app.config import settings

# Initialize Client
client = genai.Client(
    api_key=settings.API_KEY,
    http_options={"base_url": settings.GOOGLE_GENAI_BASE_URL}
)

MODEL_NAME = "gemini-2.0-flash"
BASE_DIR = settings.DATA_DIR
EXAMPLE_VIDEO_DIR = os.path.join(BASE_DIR, "范例视频")

def analyze_video(video_path):
    print(f"Analyzing {video_path}...")
    try:
        with open(video_path, "rb") as f:
            video_bytes = f.read()
        
        prompt = """
        你是一名专业的康复训练专家。请分析这个视频中的康复动作。
        返回一个纯 JSON 对象（不要使用 Markdown 格式），包含以下两个字段：
        1. "title": 动作的简短中文名称（例如"颈椎侧屈拉伸"、"腰部旋转"、"麦肯基伸展"）。
        2. "tags": 一个包含3-5个相关中文标签的列表（例如 ["颈椎", "拉伸", "康复"]）。
        
        JSON 格式示例：
        {
            "title": "动作名称",
            "tags": ["标签1", "标签2", "标签3"]
        }
        """
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=prompt),
                        types.Part(inline_data=types.Blob(
                            mime_type="video/mp4",
                            data=video_bytes
                        ))
                    ]
                )
            ]
        )
        
        # Clean up response text to ensure valid JSON
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        
        return json.loads(text)
    except Exception as e:
        print(f"Error analyzing video {video_path}: {e}")
        return None

def get_next_index(title):
    # Find existing folders starting with title
    existing_indices = []
    for folder_name in os.listdir(EXAMPLE_VIDEO_DIR):
        if folder_name.startswith(f"{title}-"):
            try:
                parts = folder_name.split("-")
                if len(parts) > 1 and parts[-1].isdigit():
                    idx = int(parts[-1])
                    existing_indices.append(idx)
            except ValueError:
                pass
    
    if not existing_indices:
        return 1
    return max(existing_indices) + 1

def get_target_folders():
    targets = []
    if not os.path.exists(EXAMPLE_VIDEO_DIR):
        return targets
        
    for d in os.listdir(EXAMPLE_VIDEO_DIR):
        path = os.path.join(EXAMPLE_VIDEO_DIR, d)
        if os.path.isdir(path):
            # Target folders starting with "背部训练" or "下背痛"
            if d.startswith("背部训练") or d.startswith("下背痛"):
                targets.append(d)
    return targets

def process_existing_folder(folder_name):
    source_dir = os.path.join(EXAMPLE_VIDEO_DIR, folder_name)
    video_path = os.path.join(source_dir, "视频.mp4")
    
    if not os.path.exists(video_path):
        print(f"No video found in {folder_name}, skipping.")
        return

    # Analyze
    result = analyze_video(video_path)
    if not result:
        print(f"Skipping {folder_name} due to analysis failure.")
        return
        
    title = result.get("title", "未知动作")
    tags = result.get("tags", [])
    
    # Determine new folder path
    index = get_next_index(title)
    new_folder_name = f"{title}-{index}"
    new_folder_path = os.path.join(EXAMPLE_VIDEO_DIR, new_folder_name)
    
    # Avoid overwriting if it happens to be the same
    if new_folder_name == folder_name:
        print(f"Name unchanged for {folder_name}, updating tags only.")
        tags_path = os.path.join(source_dir, "标签.txt")
        with open(tags_path, "w", encoding="utf-8") as f:
            f.write(",".join(tags))
        return

    os.makedirs(new_folder_path, exist_ok=True)
    
    # Move video
    new_video_path = os.path.join(new_folder_path, "视频.mp4")
    shutil.move(video_path, new_video_path)
    
    # Write tags
    tags_path = os.path.join(new_folder_path, "标签.txt")
    with open(tags_path, "w", encoding="utf-8") as f:
        f.write(",".join(tags))
        
    print(f"Renamed {folder_name} to {new_folder_name}")
    
    # Remove old folder
    shutil.rmtree(source_dir)
    
    # Sleep briefly to avoid rate limits
    time.sleep(1)

if __name__ == "__main__":
    print("Starting reorganization of Back Training and Lower Back Pain videos...")
    targets = get_target_folders()
    print(f"Found {len(targets)} folders to process: {targets}")
    
    for folder in targets:
        process_existing_folder(folder)
    
    print("Reorganization complete. Rebuilding index...")
    from app.service.example_video_index import ExampleVideoIndex
    indexer = ExampleVideoIndex(EXAMPLE_VIDEO_DIR)
    indexer.build_index()
    print("Index rebuilt.")
