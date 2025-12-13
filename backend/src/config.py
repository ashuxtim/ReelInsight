import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- PATH SETUP ---
# 1. Backend Directory (ReelInsight/backend)
BACKEND_DIR = Path(__file__).resolve().parent.parent

# 2. Project Root (ReelInsight) - Go one level up
PROJECT_ROOT = BACKEND_DIR.parent

# 3. Shared Data Directory (ReelInsight/data)
DATA_DIR = PROJECT_ROOT / "data"

# Exported Paths
VIDEO_INPUT_PATH = DATA_DIR / "raw_videos"
AUDIO_OUTPUT_PATH = DATA_DIR / "processed_audio"
FRAMES_OUTPUT_PATH = DATA_DIR / "processed_frames"
CHROMA_DB_PATH = DATA_DIR / "chroma_db"

# Create folders if missing
for path in [VIDEO_INPUT_PATH, AUDIO_OUTPUT_PATH, FRAMES_OUTPUT_PATH, CHROMA_DB_PATH]:
    path.mkdir(parents=True, exist_ok=True)

# Settings
FRAME_INTERVAL = 2