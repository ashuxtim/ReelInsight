import requests
import time
import os

# Configuration
API_URL = "http://localhost:8000/process_url"
URL_FILE = "urls.txt"

def bulk_upload():
    print("🚀 ReelInsight Data Factory Initialized")
    
    if not os.path.exists(URL_FILE):
        print(f"❌ Error: '{URL_FILE}' not found. Create it with YouTube links first!")
        return

    try:
        with open(URL_FILE, "r") as f:
            # Filter out empty lines and comments
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return

    print(f"📋 Found {len(urls)} videos to process.\n")
    
    for i, video_url in enumerate(urls):
        print(f"[{i+1}/{len(urls)}] Sending: {video_url}")
        
        try:
            response = requests.post(API_URL, json={"url": video_url})
            if response.status_code == 200:
                print(f"   ✅ Queued: {response.json().get('filename')}")
            else:
                print(f"   ❌ Failed: {response.text}")
        except Exception as e:
            print(f"   ⚠️ Connection Error: {e}")
            print("   (Is ./reel.sh running?)")
            
        # 5-second pause to be polite to YouTube
        time.sleep(5)

    print("\n🎉 Batch Complete. Check your Worker logs!")

if __name__ == "__main__":
    bulk_upload()