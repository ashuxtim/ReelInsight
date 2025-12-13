import shutil
import time
import asyncio
import re
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Header, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.config import DATA_DIR
from src.search_engine import VideoSearchEngine
from src.ingest import VideoProcessor
from src.embed_audio import AudioTranscriber
from src.embed_vision import VisionEmbedder
from src.embed_text import TextEmbedder
from src.download import download_video
from src.llm_engine import summarize_video, ask_question, generate_chapters
from src.config import VIDEO_INPUT_PATH

def sanitize_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_.-]', '', name.replace(' ', '_'))

search_engine = None
upload_progress = {} 
executor = ThreadPoolExecutor(max_workers=1) # One video at a time to save GPU

@asynccontextmanager
async def lifespan(app: FastAPI):
    global search_engine
    print("🚀 Server starting...")
    search_engine = VideoSearchEngine() # Load CLIP once
    yield

app = FastAPI(title="ReelInsight API", lifespan=lifespan)

# 1. Enable CORS (Allows Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all connections (Safe for local dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Serve Images (Allows Browser to see frames)
# Access images at: http://localhost:8000/data/processed_frames/video_id/frame.jpg
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
# --- PROGRESS HELPER ---
def update_status(filename, percent, message):
    upload_progress[filename] = {"percent": percent, "status": message}
    print(f"[{percent}%] {filename}: {message}")

# --- THE UNIFIED PIPELINE ---
def process_video_task(filename: str):
    """Runs the full GPU pipeline sequence"""
    try:
        vid_id = Path(filename).stem
        
        # 1. Ingest (Extract Frames & Audio)
        update_status(filename, 10, "Extracting Frames & Audio...")
        processor = VideoProcessor(filename)
        processor.process() # Uses ffmpeg & cv2

        # 2. Transcribe (Whisper on GPU)
        update_status(filename, 40, "Transcribing Audio (Whisper)...")
        # Initialize here to save VRAM when idle
        AudioTranscriber("base").transcribe(f"{vid_id}.wav") 
        
        # 3. Embed Text (CLIP Text)
        update_status(filename, 60, "Embedding Transcript...")
        TextEmbedder().process_transcripts()

        # 4. Embed Vision (CLIP Vision on GPU)
        update_status(filename, 70, "Embedding Visuals (CLIP)...")
        VisionEmbedder().process_video_frames(vid_id)

        update_status(filename, 100, "Processing Complete! Ready to Search.")
        
    except Exception as e:
        update_status(filename, -1, f"Error: {str(e)}")
        print(f"❌ Pipeline Failed: {e}")

async def run_in_background(filename: str):
    """Async wrapper to run the blocking pipeline without freezing API"""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(executor, process_video_task, filename)

# --- ENDPOINTS ---

class URLRequest(BaseModel):
    url: str

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # 1. Save File with SANITIZED Name
    timestamp = int(time.time())
    # Clean the uploaded filename immediately
    clean_name = sanitize_filename(file.filename)
    fname = f"{timestamp}_{clean_name}"
    
    save_path = VIDEO_INPUT_PATH / fname
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 2. Trigger Pipeline
    update_status(fname, 0, "Uploaded. Queued for Processing...")
    background_tasks.add_task(run_in_background, fname)
    
    return {"filename": fname}

@app.post("/process_url")
async def process_url_endpoint(request: URLRequest, background_tasks: BackgroundTasks):
    try:
        # 1. Download
        update_status("downloading...", 0, "Downloading from YouTube...")
        filename = download_video(request.url)
        
        # 2. Trigger Pipeline
        update_status(filename, 0, "Downloaded. Queued for Processing...")
        background_tasks.add_task(run_in_background, filename)
        
        return {"filename": filename}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/progress/{filename}")
def get_progress(filename: str):
    return upload_progress.get(filename, {"percent": 0, "status": "Not started"})

@app.get("/search")
def search(query: str, k: int = 10, filter: str = None):
    if filter in ["All Videos", ""]: filter = None
    if filter: filter = filter.replace(".mp4", "")
    return {"results": search_engine.search(query, k, filter)}

@app.get("/videos")
def get_videos():
    if not VIDEO_INPUT_PATH.exists(): return {"videos": []}
    return {"videos": [f.name for f in VIDEO_INPUT_PATH.glob("*.mp4")]}

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

# --- 🚀 NEW STREAMING ENDPOINT (Fixes the "Start at 0" bug) ---
@app.get("/stream/{video_id}")
async def stream_video(video_id: str, request: Request, range: str = Header(None)):
    video_path = VIDEO_INPUT_PATH / video_id
    
    # Handle missing extension
    if not video_path.exists():
        video_path = VIDEO_INPUT_PATH / f"{video_id}.mp4"
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    file_size = video_path.stat().st_size
    start = 0
    end = file_size - 1

    # Handle "Range" header (The browser asking for a specific part)
    if range:
        try:
            start, end = range.replace("bytes=", "").split("-")
            start = int(start)
            end = int(end) if end else file_size - 1
        except ValueError:
            pass # Invalid range, default to full file

    # Ensure valid range
    if start >= file_size or start < 0:
        raise HTTPException(status_code=416, detail="Range not satisfiable")

    # Content length for this chunk
    chunk_size = end - start + 1

    def iterfile():
        with open(video_path, "rb") as f:
            f.seek(start)
            # Read in chunks (e.g., 1MB)
            bytes_to_read = chunk_size
            while bytes_to_read > 0:
                chunk = f.read(min(1024 * 1024, bytes_to_read))
                if not chunk:
                    break
                yield chunk
                bytes_to_read -= len(chunk)

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "video/mp4",
    }

    return StreamingResponse(iterfile(), status_code=206, headers=headers)