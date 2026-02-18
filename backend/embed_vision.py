import torch
import clip
import json
from PIL import Image
from pathlib import Path
from config import settings
from db import db
from logger import log

class VisionEmbedder:
    def __init__(self):
        # 🚀 UPGRADE: Using ViT-L/14 (Large) for high-accuracy visual search
        # This requires ~2GB VRAM, which is fine for your L4 or local GPU.
        self.model_name = "ViT-L/14" 
        log.info(f"👁️ Loading CLIP Model: {self.model_name}...")
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Jit=False helps with some compatibility issues on newer PyTorch versions
        self.model, self.preprocess = clip.load(self.model_name, device=self.device, jit=False)

    def process_video_frames(self, video_id: str):
        video_dir = settings.TEMP_DIR / video_id
        if not video_dir.exists():
            log.error(f"❌ Frames folder missing: {video_dir}")
            raise FileNotFoundError(f"Frames directory not found: {video_dir}")

        log.info(f"⚡ Embedding Frames for: {video_id} (Model: {self.model_name})")
        
        ts_path = video_dir / "timestamps.json"
        if not ts_path.exists():
            raise FileNotFoundError(f"Timestamps metadata missing: {ts_path}")
            
        with open(ts_path, 'r') as f:
            frames_meta = json.load(f)

        # Smaller batch size for the Larger Model to prevent OOM
        batch_size = 4 
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
                    except Exception as e:
                        log.warning(f"⚠️ Failed to load frame {frame_path}: {e}")
                        continue

            if not batch_images: continue

            image_input = torch.tensor(torch.stack(batch_images)).to(self.device)
            with torch.no_grad():
                # Encode and normalize
                embeddings = self.model.encode_image(image_input)
                embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
                embeddings = embeddings.cpu().numpy()

            batch_data = []
            for j, embedding in enumerate(embeddings):
                meta = valid_batch_meta[j]
                batch_data.append({
                    "id": f"{video_id}_{float(meta['timestamp']):.2f}",
                    "embedding": embedding.flatten().tolist(), # Should be 768 long
                    "metadata": {
                        "video_id": video_id,
                        "timestamp": float(meta["timestamp"]),
                        "frame_path": meta.get("s3_key", f"{video_id}/frames/{meta['filename']}")
                    }
                })

            db.add_frames(video_id, batch_data)
            if i % 20 == 0:
                log.info(f"   ↳ Processed {min(i + batch_size, total_frames)}/{total_frames} frames...")

if __name__ == "__main__":
    pass