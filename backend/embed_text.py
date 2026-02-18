import json
import torch
from pathlib import Path
from sentence_transformers import SentenceTransformer
from config import settings
from db import db
from logger import log

class TextEmbedder:
    def __init__(self):
        # 🚀 UPGRADE: Switched from CLIP (Vision) to MiniLM (Pure Text)
        # This is 5x faster on CPU and significantly more accurate for text search.
        self.model_name = "all-MiniLM-L6-v2"
        log.info(f"📝 Loading Text Model: {self.model_name}...")
        
        # FORCE CPU: This ensures we don't crash your 16GB RAM with CUDA overhead
        # The model is small enough that CPU is very fast.
        self.device = "cpu"
        
        try:
            self.model = SentenceTransformer(self.model_name, device=self.device)
        except Exception as e:
            log.error(f"❌ Failed to load SentenceTransformer: {e}")
            raise

    def process_transcripts(self, video_id: str):
        json_path = settings.TEMP_DIR / f"{video_id}.json"
        
        # 1. Fetch transcript if missing (Stateless check)
        if not json_path.exists():
            from storage import storage
            try:
                log.info(f"📥 Fetching transcript from Storage for {video_id}...")
                storage.client.fget_object(settings.MINIO_BUCKET, f"{video_id}/transcript.json", str(json_path))
            except:
                log.error(f"❌ Transcript missing for embedding: {video_id}")
                return # Fail gracefully

        log.info(f"⚡ Embedding Transcript for: {video_id}")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        segments = data if isinstance(data, list) else data.get("segments", [])
        
        # 2. Prepare Batch
        # We filter out tiny snippets (< 5 chars) to reduce noise
        valid_segments = [seg for seg in segments if len(seg['text'].strip()) > 5]
        texts = [seg['text'].strip() for seg in valid_segments]
        
        if not texts:
            log.warning("⚠️ No valid text found in transcript.")
            return

        # 3. Batch Inference (Fast on CPU)
        # batch_size=32 is a safe sweet spot for Ryzen CPUs
        embeddings = self.model.encode(texts, batch_size=32, convert_to_numpy=True)
        
        batch_data = []
        for i, seg in enumerate(valid_segments):
            batch_data.append({
                "id": f"{video_id}_txt_{float(seg['start']):.2f}",
                "embedding": embeddings[i].tolist(), # 384 dimensions
                "metadata": {
                    "video_id": video_id,
                    "timestamp": float(seg['start']),
                    "text": seg['text'].strip(),
                    "end": float(seg['end'])
                }
            })

        # 4. Save to DB
        db.add_transcripts(video_id, batch_data)
        log.info(f"✅ Saved {len(batch_data)} text segments (Model: {self.model_name}).")

if __name__ == "__main__":
    pass