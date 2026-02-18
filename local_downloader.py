import os
import subprocess
import time
import re

# 1. Setup
URLS_FILE = "urls.txt"
OUTPUT_DIR = "downloaded_videos"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def sanitize(name):
    # Matches the sanitization logic in your backend
    return re.sub(r'[^a-zA-Z0-9_.-]', '', name.replace(' ', '_'))

# 2. Read URLs
try:
    with open(URLS_FILE, "r") as f:
        urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
except FileNotFoundError:
    print(f"❌ Error: {URLS_FILE} not found. Please create it first.")
    exit(1)

print(f"🚀 Found {len(urls)} videos to download locally...")

for i, url in enumerate(urls):
    timestamp = int(time.time())
    print(f"\n⬇️ [{i+1}/{len(urls)}] Downloading: {url}")
    
    # We use a template that matches your backend's naming logic: {timestamp}_{title}.mp4
    output_template = f"{OUTPUT_DIR}/{timestamp}_%(title)s.%(ext)s"
    
    # 🔥 FIX: Force H.264 (avc1) to avoid AV1/VP9 issues
    # We ask for best video under 720p THAT IS ALSO H.264
    format_selection = (
        "bestvideo[height<=720][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/"
        "best[height<=720][ext=mp4][vcodec^=avc1]"
    )

    command = [
        "yt-dlp",
        "-f", format_selection,
        "-o", output_template,
        "--restrict-filenames", # Ensures clean filenames (no spaces/emojis)
        "--merge-output-format", "mp4", # Double insurance
        url
    ]
    
    try:
        subprocess.run(command, check=True)
        print("   ✅ Success")
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed: {e}")

print("\n🎉 All downloads complete. Ready to Rsync!")