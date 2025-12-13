import torch
import clip
from src.db import db # <--- Importing the single DB instance

class VideoSearchEngine:
    def __init__(self):
        print("🧠 Loading Search Engine (CLIP Model)...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, _ = clip.load("ViT-B/32", device=self.device)

    def load_indices(self):
        print("✅ Search Engine Ready.")

    def search(self, query: str, k=5, video_filter=None): # Removed 'mode' param
        print(f"🔍 Searching: '{query}'")
        
        # Encode Query
        text_token = clip.tokenize([query[:77]], truncate=True).to(self.device)
        with torch.no_grad():
            query_vector = self.model.encode_text(text_token).cpu().numpy().flatten().tolist()
        
        # Search DB
        v_results = db.search_vision(query_vector, k=k*3, filter=video_filter)
        t_results = db.search_text(query_vector, k=k*3, filter=video_filter)
        
        fusion_map = {}

        # Fusion Logic (Standard)
        if v_results['ids']:
            for i, _ in enumerate(v_results['ids'][0]):
                meta = v_results['metadatas'][0][i]
                score = 1 - v_results['distances'][0][i]
                ts = int(meta['timestamp'])
                if ts not in fusion_map:
                    fusion_map[ts] = {
                        "score": score * 0.6,
                        "video_id": meta['video_id'],
                        "timestamp": meta['timestamp'],
                        "frame_path": meta['frame_path'],
                        "type": "📸 Visual",
                        "context": "Visual Match"
                    }

        if t_results['ids']:
            for i, _ in enumerate(t_results['ids'][0]):
                meta = t_results['metadatas'][0][i]
                score = 1 - t_results['distances'][0][i]
                audio_ts = int(meta['timestamp'])
                matched = False
                for offset in range(-2, 3):
                    if (audio_ts + offset) in fusion_map:
                        entry = fusion_map[audio_ts + offset]
                        entry["score"] += score * 0.4
                        entry["type"] = "✨ Hybrid"
                        entry["context"] += f" + Said: \"{meta['text']}...\""
                        matched = True
                        break
                if not matched:
                    frame_path = meta.get('frame_path', "") 
                    fusion_map[audio_ts] = {
                        "score": score * 0.4,
                        "video_id": meta['video_id'],
                        "timestamp": meta['timestamp'],
                        "frame_path": frame_path,
                        "type": "🗣️ Speech",
                        "context": f"Said: \"{meta['text']}...\""
                    }

        results = list(fusion_map.values())
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:k]