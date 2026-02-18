import os
import json
from minio import Minio
from minio.deleteobjects import DeleteObject
from datetime import timedelta
from config import settings
from logger import log

class Storage:
    def __init__(self):
        log.info(f"☁️ Connecting to MinIO at {settings.MINIO_ENDPOINT}...")
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False 
        )
        self._ensure_bucket()
        # We replace the broken CORS logic with a standard Policy
        self._set_public_policy()

    def _ensure_bucket(self):
        if not self.client.bucket_exists(settings.MINIO_BUCKET):
            log.info(f"📦 Creating Bucket: {settings.MINIO_BUCKET}")
            self.client.make_bucket(settings.MINIO_BUCKET)

    def _set_public_policy(self):
        """
        Sets a Read-Only policy for the bucket.
        This ensures browsers can load images without CORS complex setup.
        """
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET}/*"]
                }
            ]
        }
        try:
            self.client.set_bucket_policy(settings.MINIO_BUCKET, json.dumps(policy))
            log.info("🔓 Bucket Policy set to Public Read (Images unlocked).")
        except Exception as e:
            # We log but don't crash if this fails
            log.warning(f"⚠️ Could not set Bucket Policy: {e}")

    def upload_file(self, local_path: str, object_name: str) -> bool:
        try:
            self.client.fput_object(settings.MINIO_BUCKET, object_name, local_path)
            log.info(f"✅ Uploaded to MinIO: {object_name}")
            return True
        except Exception as e:
            log.error(f"❌ MinIO Upload Error: {e}")
            return False

    def exists(self, object_name: str) -> bool:
        try:
            self.client.stat_object(settings.MINIO_BUCKET, object_name)
            return True
        except:
            return False

    def list_videos(self):
        objects = self.client.list_objects(settings.MINIO_BUCKET, recursive=False)
        videos = []
        for obj in objects:
            if obj.is_dir:
                vid_id = obj.object_name.replace("/", "")
                thumb_url = self.get_presigned_url(f"{vid_id}/frames/frame_0000.jpg")
                videos.append({"id": vid_id, "thumbnail": thumb_url})
        return videos

    def delete_folder(self, prefix: str):
        objects_to_delete = self.client.list_objects(settings.MINIO_BUCKET, prefix=prefix, recursive=True)
        # Fix for delete: wrap names in DeleteObject
        delete_list = [DeleteObject(obj.object_name) for obj in objects_to_delete]
        
        if not delete_list: return
        
        errors = self.client.remove_objects(settings.MINIO_BUCKET, delete_list)
        for err in errors:
            log.error(f"Error deleting {err}")

    def get_presigned_url(self, object_name: str, expiration=3600):
        try:
            url = self.client.get_presigned_url(
                "GET",
                settings.MINIO_BUCKET,
                object_name,
                expires=timedelta(seconds=expiration),
            )
            # FIX: Ensure browser can reach it (Docker DNS vs Localhost)
            public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", "localhost:9000")
            internal_endpoint = f"{settings.MINIO_ENDPOINT}"

            if internal_endpoint in url:
                url = url.replace(internal_endpoint, public_endpoint)
            return url
        
        except Exception as e:
            log.error(f"URL Gen Error: {e}")
            return ""

storage = Storage()