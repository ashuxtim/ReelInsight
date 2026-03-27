import os
import redis
from celery import Celery
from pathlib import Path
from ingest import VideoProcessor
from embed_audio import AudioTranscriber
from embed_vision import VisionEmbedder
from embed_text import TextEmbedder
from db import db
from storage import storage
from logger import log
from config import settings
from llm_engine import summarize_video, ask_question, generate_chapters, generate_synthetic_data

MODEL_CACHE = {}

def get_model(model_class, *args):
    key = model_class.__name__
    if key not in MODEL_CACHE:
        log.info(f"🧠 Loading Model: {key}...")
        MODEL_CACHE[key] = model_class(*args)
    return MODEL_CACHE[key]

# Redis Config
celery_app = Celery("reel_worker", broker=f"redis://{settings.REDIS_HOST}:6379/0", backend=f"redis://{settings.REDIS_HOST}:6379/0")
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

redis_client = redis.Redis(host=settings.REDIS_HOST, port=6379, db=0, decode_responses=True)

def update_status(filename, percent, message):
    key = f"progress:{filename}"
    redis_client.hset(key, mapping={"percent": percent, "status": message})
    redis_client.expire(key, 3600)
    log.info(f"[{percent}%] {filename}: {message}")

def check_cancel_signal(filename):
    """Checks if the user hit the Cancel button"""
    if redis_client.exists(f"cancel:{filename}"):
        log.warning(f"🛑 Worker detected CANCEL signal for {filename}. Aborting task.")
        raise InterruptedError("Processing Cancelled by User")

@celery_app.task(bind=True)
def process_video_task(self, filename: str):
    vid_id = Path(filename).stem
    processor = None
    
    try:
        log.info(f"Starting processing for {filename}")
        check_cancel_signal(filename) # 🛑 Check 1
        
        # 1. Ingest
        update_status(filename, 10, "Extracting Frames & Audio...")
        # Pass a lambda that calls our existing check function
        processor = VideoProcessor(filename, cancel_callback=lambda: check_cancel_signal(filename))
        processor.process()

        check_cancel_signal(filename) # 🛑 Check 2

        # 2. Transcribe
        update_status(filename, 40, "Transcribing Audio...")
        get_model(AudioTranscriber, "base").transcribe(vid_id)
        
        check_cancel_signal(filename) # 🛑 Check 3

        # 3. Embed Text
        update_status(filename, 60, "Embedding Transcript...")
        get_model(TextEmbedder).process_transcripts(vid_id)

        check_cancel_signal(filename) # 🛑 Check 4

        # 4. Embed Vision
        update_status(filename, 70, "Embedding Visuals...")
        get_model(VisionEmbedder).process_video_frames(vid_id)

        # 5. [NEW] Generate Training Data
        update_status(filename, 90, "Generating QLoRA Data...")
        generate_synthetic_data(vid_id)

        update_status(filename, 100, "Processing Complete! Ready to Search.")
        return "Done"

    except InterruptedError:
        # ✨ Handle User Cancellation gracefully
        log.info(f"✅ Clean cancellation for {filename}")
        update_status(filename, -1, "Cancelled by User")

    except Exception as e:
        log.error(f"💥 CRITICAL FAILURE on {filename}: {e}")
        update_status(filename, -1, f"Failed: {str(e)}")
        raise e
        
    finally:
        if processor:
            processor.cleanup()