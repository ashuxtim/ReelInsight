import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from config import settings
from logger import log


class ReelInsightDB:
    def __init__(self):
        log.info(f"🔌 Connecting to Vector DB at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}...")
        self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        
        # 👁️ VISION: Remains CLIP ViT-L/14 (768 Dimensions)
        self._init_collection("vision_frames", 768)
        
        # 🧠 TEXT: Swapping to MiniLM-L6-v2 (384 Dimensions)
        # We check if migration is needed inside _init_collection
        self._init_collection("video_transcripts", 384)

    def _init_collection(self, name, target_vector_size):
        try:
            # 1. Check if collection exists
            collection_info = self.client.get_collection(name)
            
            # 2. VALIDATE SIZE: If old collection has wrong size, we must nuke it
            current_size = collection_info.config.params.vectors.size
            if current_size != target_vector_size:
                log.warning(f"⚠️ Collection '{name}' dimension mismatch! (Current: {current_size}, Target: {target_vector_size})")
                log.warning(f"♻️ Re-creating collection '{name}' to fix compatibility...")
                self.client.delete_collection(name)
                raise ValueError("Collection deleted for migration") # Trigger creation block below

            log.info(f"✅ Collection ready: {name} (Dim: {target_vector_size})")

        except Exception:
            # 3. Create if missing or just deleted
            log.info(f"✨ Creating Collection: {name} (Dim: {target_vector_size})")
            try:
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=models.VectorParams(size=target_vector_size, distance=models.Distance.COSINE)
                )
            except Exception as create_error:
                log.error(f"❌ Failed to create collection {name}: {create_error}")
                raise


    def _to_uuid(self, id_str):
        """
        🛡️ FIX: Qdrant strictly requires UUIDs or Integers for IDs.
        """
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(id_str)))

    def add_frames(self, video_id, data):
        if not data: return
        
        # Vision is always 768 (CLIP)
        expected_dim = 768
        for item in data:
            emb_len = len(item["embedding"])
            if emb_len != expected_dim:
                raise ValueError(f"Invalid embedding dimension for {item['id']}: expected {expected_dim}, got {emb_len}")
        
        points = [
            models.PointStruct(
                id=self._to_uuid(item["id"]),
                vector=item["embedding"],
                payload=item["metadata"]
            )
            for item in data
        ]
        self.client.upsert(collection_name="vision_frames", points=points)
        log.info(f" 💾 Saved {len(points)} frames to Qdrant.")


    def add_transcripts(self, video_id, data):
        if not data: return
        
        # Text is now 384 (MiniLM)
        expected_dim = 384
        for item in data:
            emb_len = len(item["embedding"])
            if emb_len != expected_dim:
                raise ValueError(f"Invalid embedding dimension for {item['id']}: expected {expected_dim}, got {emb_len}")
        
        points = [
            models.PointStruct(
                id=self._to_uuid(item["id"]),
                vector=item["embedding"],
                payload=item["metadata"]
            )
            for item in data
        ]
        self.client.upsert(collection_name="video_transcripts", points=points)

    def search_vision(self, vector, k=10, filter_video_id=None):
        query_filter = None
        if filter_video_id:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="video_id",
                        match=models.MatchValue(value=filter_video_id)
                    )
                ]
            )

        results = self.client.search(
            collection_name="vision_frames",
            query_vector=vector,
            query_filter=query_filter,
            limit=k
        )
        return [{"id": hit.id, "score": hit.score, "metadata": hit.payload} for hit in results]

    def search_text(self, vector, k=10, filter_video_id=None):
        query_filter = None
        if filter_video_id:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="video_id",
                        match=models.MatchValue(value=filter_video_id)
                    )
                ]
            )

        results = self.client.search(
            collection_name="video_transcripts",
            query_vector=vector,
            query_filter=query_filter,
            limit=k
        )
        return [{"id": hit.id, "score": hit.score, "metadata": hit.payload} for hit in results]
    
    def delete_video(self, video_id):
        """Removes all vectors (Vision & Text) for a specific video."""
        try:
            self.client.delete(
                collection_name="vision_frames",
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[models.FieldCondition(key="video_id", match=models.MatchValue(value=video_id))]
                    )
                ),
            )
            self.client.delete(
                collection_name="video_transcripts",
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[models.FieldCondition(key="video_id", match=models.MatchValue(value=video_id))]
                    )
                ),
            )
            log.info(f"🗑️ Deleted vectors for {video_id}")
        except Exception as e:
            log.error(f"⚠️ Vector Delete Failed: {e}")

db = ReelInsightDB()