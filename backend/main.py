import shutil
import time
import re
import os
import redis
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel
from db import db
from storage import storage
import aiofiles

# --- IMPORTS (Flattened Structure) ---
from config import settings
from search_engine import VideoSearchEngine
from download import download_video
from llm_engine import summarize_video, ask_question, generate_chapters
from logger import log
# Import the Celery Task
from worker import process_video_task

def sanitize_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_.-]', '', name.replace(' ', '_'))

search_engine = None

# Connect to Redis (For reading progress)
REDIS_HOST = settings.REDIS_HOST
redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global search_engine
    log.info("🚀 Server starting...")
    search_engine = VideoSearchEngine() # Load CLIP once
    yield

app = FastAPI(title="ReelInsight API", lifespan=lifespan)

# 1. Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINTS ---

class URLRequest(BaseModel):
    url: str

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    # 1. Save Locally (Invisible Temp)
    timestamp = int(time.time())
    clean_name = sanitize_filename(file.filename)
    fname = f"{timestamp}_{clean_name}"
    
    # USE TEMP_DIR
    save_path = settings.TEMP_DIR / fname
    
    # Changed to async write
    async with aiofiles.open(save_path, 'wb') as out_file:
        while content := await file.read(1024 * 1024):  # Read in 1MB chunks
            await out_file.write(content)
    
    # 2. Upload to MinIO
    video_id = Path(fname).stem
    storage.upload_file(str(save_path), f"{video_id}/source.mp4")

    # 3. Dispatch & Cleanup
    redis_client.hset(f"progress:{fname}", mapping={"percent": 0, "status": "Uploaded to Cloud. Queued..."})
    process_video_task.delay(fname)
    
    # Optional: Delete local immediately since MinIO has it
    # os.remove(save_path) 
    
    return {"filename": fname}

@app.post("/process_url")
def process_url_endpoint(request: URLRequest):
    try:
        redis_client.hset("progress:downloading...", mapping={"percent": 10, "status": "Downloading from YouTube..."})
        
        # 1. Download (Saves to TEMP_DIR now)
        filename = download_video(request.url)
        
        if not filename:
            raise Exception("Download failed: No filename returned.")

        # 2. Upload to MinIO
        local_path = settings.TEMP_DIR / filename
        video_id = Path(filename).stem
        
        if not local_path.exists():
             raise Exception(f"File missing after download: {local_path}")

        log.info(f"☁️ Uploading {filename} to MinIO...")
        redis_client.hset(f"progress:{filename}", mapping={"percent": 20, "status": "Uploading to Cloud..."})
        
        success = storage.upload_file(str(local_path), f"{video_id}/source.mp4")
        if not success:
             raise Exception("Failed to upload video to MinIO storage.")

        # 3. Dispatch
        redis_client.hset(f"progress:{filename}", mapping={"percent": 30, "status": "Queued for AI Processing..."})
        process_video_task.delay(filename)
        
        return {"filename": filename}

    except Exception as e:
        log.error(f"❌ Process URL Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/cancel/{filename}")
def cancel_processing(filename: str):
    log.warning(f"🛑 Received CANCEL signal for {filename}")
    
    # 1. Set the STOP FLAG in Redis (Worker checks this)
    redis_client.set(f"cancel:{filename}", "1", ex=3600)
    
    # 2. Immediate Cleanup 
    # Reuse existing delete logic to wipe partial data
    video_id = Path(filename).stem
    delete_video_endpoint(video_id)
    
    return {"status": "cancelled", "id": filename}


@app.get("/progress/{filename}")
def get_progress(filename: str):
    """Reads real-time status from Redis"""
    key = f"progress:{filename}"
    data = redis_client.hgetall(key)
    
    if not data:
        return {"percent": 0, "status": "Not found / Waiting"}
    
    return {
        "percent": int(data.get("percent", 0)),
        "status": data.get("status", "Unknown")
    }

@app.get("/search")
def search(query: str, k: int = 10, filter: str = None):
    if filter in ["All Videos", ""]: filter = None
    if filter: filter = filter.replace(".mp4", "")
    return {"results": search_engine.search(query, k, filter)}

@app.get("/videos")
def get_videos():
    """Returns list of videos from MinIO with thumbnails"""
    return {"videos": storage.list_videos()}

@app.delete("/videos/{video_id}")
def delete_video_endpoint(video_id: str):
    """The Nuclear Option: Wipes DB, Storage, and Cache"""
    video_id = video_id.replace(".mp4", "")
    
    log.info(f"🧨 Nuke request received for: {video_id}")

    # 1. Delete from MinIO
    storage.delete_folder(f"{video_id}/")
    
    # 2. Delete from Vector DB
    db.delete_video(video_id)
    
    # 3. Clear Redis Status
    redis_client.delete(f"progress:{video_id}.mp4")
    redis_client.delete(f"progress:{video_id}")
    
    return {"status": "deleted", "id": video_id}

@app.get("/summarize")
def api_summarize(video_id: str):
    video_id = video_id.replace(".mp4", "")
    return {"summary": summarize_video(video_id)}

@app.get("/ask_ai")
def api_ask_ai(query: str, video_filter: str = None):
    if video_filter in ["All Videos", ""]: video_filter = None
    if video_filter: video_filter = video_filter.replace(".mp4", "")
    res = search_engine.search(query, k=15, video_filter=video_filter)
    return {"answer": ask_question(query, res), "context": res}

@app.get("/chapters")
def api_chapters(video_id: str):
    video_id = video_id.replace(".mp4", "")
    return {"chapters": generate_chapters(video_id)}

@app.get("/stream/{video_id}")
async def stream_video(video_id: str):
    """
    STATELESS STREAMING:
    Redirects the browser to a temporary, secure MinIO URL.
    MinIO handles the byte-range requests (seeking) automatically.
    """
    # Ensure video_id has no extension for directory lookup, but MinIO needs 'source.mp4'
    clean_id = video_id.replace(".mp4", "")
    object_name = f"{clean_id}/source.mp4"
    
    # Generate a link valid for 1 hour
    url = storage.get_presigned_url(object_name)
    
    if not url:
        raise HTTPException(status_code=404, detail="Video not found in Cloud Storage")
        
    return RedirectResponse(url=url)