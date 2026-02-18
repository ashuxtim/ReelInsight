import yt_dlp
import time
import re
import os
from pathlib import Path
from config import settings
from logger import log

def sanitize_filename(name: str) -> str:
    """Removes special chars and replaces spaces with underscores"""
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '', name.replace(' ', '_'))
    return clean

def download_video(url: str) -> str:
    log.info(f"⬇️ Starting download for: {url}")
    
    # 1. Use Invisible Temp Directory
    work_dir = settings.TEMP_DIR
    work_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(time.time())
    temp_template = str(work_dir / f"{timestamp}_%(title)s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestvideo[height<=720][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[height<=720][ext=mp4][vcodec^=avc1]/best',
        'outtmpl': temp_template,
        'noplaylist': True,
        'restrictfilenames': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.youtube.com/',
        },
        'quiet': False,
        'no_warnings': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_path = Path(ydl.prepare_filename(info))
            
            if not downloaded_path.exists() or downloaded_path.stat().st_size == 0:
                 raise Exception("YouTube returned an empty file.")

            # Sanitize
            safe_name = sanitize_filename(downloaded_path.name)
            final_path = work_dir / safe_name

            if downloaded_path != final_path:
                # Handle race condition if file already exists
                if final_path.exists():
                    log.warning(f"⚠️ Target file exists, removing old: {final_path.name}")
                    final_path.unlink()
                
                downloaded_path.rename(final_path)
                log.info(f"✅ Renamed to: {final_path.name}")
            else:
                log.info(f"✅ Download complete: {final_path.name}")

            return final_path.name


    except Exception as e:
        log.error(f"⚠️ Download Error: {e}")
        # Cleanup with proper checks
        if 'downloaded_path' in locals():
            try:
                if downloaded_path.exists():
                    os.remove(downloaded_path)
            except Exception as cleanup_error:
                log.warning(f"Failed to cleanup download: {cleanup_error}")
        raise e