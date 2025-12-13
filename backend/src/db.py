import chromadb
from pathlib import Path
from src.config import CHROMA_DB_PATH

class ReelInsightDB:
    def __init__(self):
        print(f"🔌 Connecting to Database at: {CHROMA_DB_PATH}")
        self.client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
        
        # Collections
        self.vision_col = self.client.get_or_create_collection("vision_frames", metadata={"hnsw:space": "cosine"})
        self.text_col = self.client.get_or_create_collection("video_transcripts", metadata={"hnsw:space": "cosine"})

    def add_frames(self, video_id, data):
        if not data: return
        self.vision_col.add(
            ids=[d["id"] for d in data],
            embeddings=[d["embedding"] for d in data],
            metadatas=[d["metadata"] for d in data]
        )

    def add_transcripts(self, video_id, data):
        if not data: return
        self.text_col.add(
            ids=[d["id"] for d in data],
            embeddings=[d["embedding"] for d in data],
            metadatas=[d["metadata"] for d in data],
            documents=[d["metadata"]["text"] for d in data]
        )

    def search_vision(self, vector, k=10, filter=None):
        where = {"video_id": filter} if filter else None
        return self.vision_col.query(query_embeddings=[vector], n_results=k, where=where)

    def search_text(self, vector, k=10, filter=None):
        where = {"video_id": filter} if filter else None
        return self.text_col.query(query_embeddings=[vector], n_results=k, where=where)

# --- GLOBAL INSTANCE ---
db = ReelInsightDB()