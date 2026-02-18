import os
import socket
import tempfile
from pathlib import Path
from pydantic_settings import BaseSettings

def resolve_host(docker_name: str, local_default: str = "localhost") -> str:
    """
    Auto-detects environment.
    If 'redis' (docker hostname) resolves, use it.
    Otherwise, assume we are running locally and use 'localhost'.
    """
    try:
        socket.gethostbyname(docker_name)
        return docker_name
    except socket.error:
        return local_default

class Settings(BaseSettings):
    # --- Infrastructure (Auto-Switching) ---
    REDIS_HOST: str = resolve_host("redis")
    QDRANT_HOST: str = resolve_host("qdrant")
    QDRANT_PORT: int = 6333
    
    # MinIO is tricky because of the port.
    # If inside docker: "minio:9000". If local: "localhost:9000"
    MINIO_ENDPOINT: str = f"{resolve_host('minio')}:9000"
    
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "reelinsight")

    
    # --- Paths ---
    # 1. Logs (Visible Project Folder)
    LOGS_DIR: Path = Path(__file__).parent.parent / "logs"
    
    # 2. Temp Workspace (Invisible System Temp)
    TEMP_DIR: Path = Path(tempfile.gettempdir()) / "reelinsight_temp"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories on startup
        self.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()