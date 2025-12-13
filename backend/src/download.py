import yt_dlp
import time
import re
from pathlib import Path
from src.config import VIDEO_INPUT_PATH

def sanitize_filename(name: str) -> str:
    """Removes special chars and replaces spaces with underscores"""
    # Remove non-alphanumeric chars (keep underscores, dots, hyphens)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '', name.replace(' ', '_'))
    return clean

def download_video(url: str) -> str:
    print(f"⬇️ Starting download for: {url}")
    
    timestamp = int(time.time())
    
    # We use a temporary template, but we will rename the file manually to be safe
    temp_template = str(VIDEO_INPUT_PATH / f"{timestamp}_%(title)s.%(ext)s")
    
    ydl_opts = {
        'format': 'best[ext=mp4]', 
        'outtmpl': temp_template,
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        # 'restrictfilenames': True # yt-dlp has this, but we'll do it manually for control
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 1. Get Info & Download
            info = ydl.extract_info(url, download=True)
            
            # 2. Find the file it just created
            # (We have to find it because yt-dlp might have slightly altered the title itself)
            downloaded_path = Path(ydl.prepare_filename(info))
            
            # 3. Sanitize the Filename
            original_name = downloaded_path.name
            # Remove timestamp prefix if it got doubled up, or just clean the whole thing
            # Let's just clean the original name (which includes timestamp)
            safe_name = sanitize_filename(original_name)
            
            final_path = VIDEO_INPUT_PATH / safe_name
            
            # Rename if different
            if downloaded_path != final_path:
                downloaded_path.rename(final_path)
                print(f"✅ Renamed to safe name: {final_path.name}")
            else:
                print(f"✅ Download complete: {final_path.name}")
                
            return final_path.name

    except Exception as e:
        print(f"⚠️ Download Error: {e}")
        raise e

if __name__ == "__main__":
    download_video("https://www.youtube.com/watch?v=BaW_jenozKc")