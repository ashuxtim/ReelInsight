import json
import torch
import clip
from pathlib import Path
from src.config import AUDIO_OUTPUT_PATH
from src.db import db

class TextEmbedder:
    def __init__(self):
        print("📝 Loading CLIP Model (Text)...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, _ = clip.load("ViT-B/32", device=self.device)

    def process_transcripts(self):
        # Scan all JSON transcripts
        for json_file in AUDIO_OUTPUT_PATH.glob("*.json"):
            video_id = json_file.stem
            print(f"⚡ Embedding Transcript for: {video_id}")
            
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            segments = data if isinstance(data, list) else data.get("segments", [])
            
            batch_data = []
            
            for seg in segments:
                text = seg['text'].strip()
                if len(text) < 5: continue # Skip noise

                # 1. Generate Embedding
                text_token = clip.tokenize([text[:77]], truncate=True).to(self.device)
                with torch.no_grad():
                    embedding = self.model.encode_text(text_token).cpu().numpy().flatten().tolist()

                # 2. Prepare for Chroma
                batch_data.append({
                    "id": f"{video_id}_txt_{seg['start']}",
                    "embedding": embedding,
                    "metadata": {
                        "video_id": video_id,
                        "timestamp": float(seg['start']),
                        "text": text,
                        "end": float(seg['end'])
                    }
                })

            # 3. Save to DB
            db.add_transcripts(video_id, batch_data)

if __name__ == "__main__":
    embedder = TextEmbedder()
    embedder.process_transcripts()