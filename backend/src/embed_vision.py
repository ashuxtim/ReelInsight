import cv2
import torch
import clip
import json  # <--- THIS WAS MISSING
from PIL import Image
from pathlib import Path
from src.config import FRAMES_OUTPUT_PATH
from src.db import db

class VisionEmbedder:
    def __init__(self):
        print("👁️ Loading CLIP Model (Vision)...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cpu":
            torch.set_num_threads(4) 
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)

    def process_video_frames(self, video_id: str):
        video_dir = FRAMES_OUTPUT_PATH / video_id
        if not video_dir.exists():
            return

        print(f"⚡ Embedding Frames for: {video_id} (Batch Mode)")
        
        ts_path = video_dir / "timestamps.json"
        if not ts_path.exists():
            print(f"❌ Timestamps file missing: {ts_path}")
            return
            
        with open(ts_path, 'r') as f:
            frames_meta = json.load(f)

        batch_size = 8
        total_frames = len(frames_meta)
        
        for i in range(0, total_frames, batch_size):
            batch_meta = frames_meta[i : i + batch_size]
            batch_images = []
            valid_batch_meta = []
            
            for meta in batch_meta:
                frame_path = video_dir / meta["filename"]
                if frame_path.exists():
                    try:
                        img = self.preprocess(Image.open(frame_path))
                        batch_images.append(img)
                        valid_batch_meta.append(meta)
                    except:
                        continue

            if not batch_images:
                continue

            image_input = torch.tensor(torch.stack(batch_images)).to(self.device)
            
            with torch.no_grad():
                embeddings = self.model.encode_image(image_input).cpu().numpy()

            batch_data = []
            for j, embedding in enumerate(embeddings):
                meta = valid_batch_meta[j]
                
                batch_data.append({
                    "id": f"{video_id}_{meta['timestamp']}",
                    "embedding": embedding.flatten().tolist(),
                    "metadata": {
                        "video_id": video_id,
                        "timestamp": float(meta["timestamp"]),
                        "frame_path": str(video_dir / meta["filename"])
                    }
                })

            db.add_frames(video_id, batch_data)
            print(f"   ↳ Processed {min(i + batch_size, total_frames)}/{total_frames} frames...")

if __name__ == "__main__":
    embedder = VisionEmbedder()
    # Manual run loop logic if needed