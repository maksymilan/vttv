import os
import sys

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.service.example_video_index import ExampleVideoIndex
from app.config import settings

def rebuild_index():
    print("Rebuilding index...")
    indexer = ExampleVideoIndex(settings.EXAMPLE_VIDEO_DIR)
    indexer.build_index()
    print("Index rebuilt.")

if __name__ == "__main__":
    rebuild_index()
