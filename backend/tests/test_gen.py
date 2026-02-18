import os
from pathlib import Path
from config import settings
from storage import storage
from ingest import VideoProcessor
from embed_audio import AudioTranscriber
from llm_engine import generate_synthetic_data

# ✅ UPDATED VIDEO ID
video_id = "1770192383_10_Important_Python_Concepts_In_20_Minutes"
filename = f"{video_id}.mp4"
local_path = settings.TEMP_DIR / filename

print(f"🚀 Starting Manual Test for: {video_id}")

# 1. Fetch Source
if not local_path.exists():
    print("⬇️  Fetching source video...")
    try:
        storage.client.fget_object(settings.MINIO_BUCKET, f"{video_id}/source.mp4", str(local_path))
        print("   ✅ Video downloaded.")
    except Exception as e:
        print(f"   ❌ Error: Could not find source.mp4 in MinIO. {e}")
        exit(1)

# 2. Ingest (Frames & Audio)
print("🎞️  Extracting Frames & Audio...")
try:
    processor = VideoProcessor(filename)
    processor.process()
    print("   ✅ Extraction complete.")
except Exception as e:
    print(f"   ❌ Ingestion Failed: {e}")
    exit(1)

# 3. Transcribe
print("🎙️  Transcribing...")
try:
    transcriber = AudioTranscriber("base") 
    transcriber.transcribe(video_id)
    print("   ✅ Transcription complete.")
except Exception as e:
    print(f"   ❌ Transcription Failed: {e}")
    exit(1)

# 4. Generate Data
print("🧪 Generating Q&A Pairs...")
generate_synthetic_data(video_id)

print("🏁 Test Complete. Check logs/training_dataset.jsonl")