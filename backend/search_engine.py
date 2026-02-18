import torch
import clip
from sentence_transformers import SentenceTransformer
from db import db
from logger import log
from storage import storage

class VideoSearchEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # 1. Load Vision Model (CLIP ViT-L/14)
        log.info(f"👁️ Loading Vision Model (CLIP) on {self.device.upper()}...")
        self.vision_model, _ = clip.load("ViT-L/14", device=self.device)
        
        # 2. Load Text Model (MiniLM) - CPU Optimized
        log.info("📝 Loading Text Model (MiniLM) on CPU...")
        # We force CPU for text to save VRAM/System RAM, as it's very fast anyway
        self.text_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

    def search(self, query: str, k=5, video_filter=None):
        log.info(f"🔍 Searching: '{query}'")
        
        # --- A. Generate Vision Vector (768 dim) ---
        # CLIP requires truncation at 77 tokens
        text_token = clip.tokenize([query[:77]], truncate=True).to(self.device)
        with torch.no_grad():
            vision_vector = self.vision_model.encode_text(text_token).cpu().numpy().flatten().tolist()
            
        # --- B. Generate Text Vector (384 dim) ---
        # MiniLM handles full sentences natively
        text_vector = self.text_model.encode(query, convert_to_numpy=True).flatten().tolist()
        
        # --- C. Parallel Search in DB ---
        # 1. Search Images using CLIP vector
        v_results = db.search_vision(vision_vector, k=k*3, filter_video_id=video_filter)
        
        # 2. Search Transcripts using MiniLM vector
        t_results = db.search_text(text_vector, k=k*3, filter_video_id=video_filter)
        
        # --- D. Reciprocal Rank Fusion (RRF) ---
        # This algorithm fairly merges results from two different models
        fusion_map = {}
        RRF_K = 60 

        def add_score(ts, vid, score, meta, type_label, text=""):
            # Round to nearest second for grouping close matches
            key = int(ts)
            
            if key not in fusion_map:
                s3_key = meta.get('frame_path', '') or f"{vid}/frames/{meta.get('filename','')}"
                fusion_map[key] = {
                    "score": 0, 
                    "video_id": vid, 
                    "timestamp": ts,
                    "frame_path": storage.get_presigned_url(s3_key),
                    "type": type_label, 
                    "context": text or "Visual Match"
                }
            
            fusion_map[key]["score"] += score
            
            # Hybrid Logic: If we find speech overlapping with a visual match, mark it
            if type_label == "🗣️ Speech" and "Visual" in fusion_map[key]["type"]:
                fusion_map[key]["type"] = "✨ Hybrid"
                fusion_map[key]["context"] += f" + {text}"

        # Rank Visuals (Weight 2.0 - Visuals are usually what users want first)
        for rank, hit in enumerate(v_results):
            rrf_score = 2.0 / (RRF_K + rank + 1)
            add_score(hit['metadata']['timestamp'], hit['metadata']['video_id'], rrf_score, hit['metadata'], "📸 Visual")

        # Rank Text (Weight 1.5 - Boosted relevance due to better model)
        for rank, hit in enumerate(t_results):
            rrf_score = 1.5 / (RRF_K + rank + 1)
            ts = hit['metadata']['timestamp']
            
            # Smart Fusion: Look for match within 2 seconds of a visual hit
            found_match = False
            for offset in range(-2, 3):
                if int(ts + offset) in fusion_map:
                    add_score(ts + offset, hit['metadata']['video_id'], rrf_score, hit['metadata'], "🗣️ Speech", f"Said: '{hit['metadata']['text']}...'")
                    found_match = True
                    break
            
            if not found_match:
                add_score(ts, hit['metadata']['video_id'], rrf_score, hit['metadata'], "🗣️ Speech", f"Said: '{hit['metadata']['text']}...'")

        # Sort by final score
        results = sorted(fusion_map.values(), key=lambda x: x["score"], reverse=True)
        return results[:k]