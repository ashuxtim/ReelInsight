import sys
from loguru import logger
from config import settings

# Remove default handler to avoid double printing
logger.remove()

# 1. Console Handler (Colored, for development)
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO"
)

# 2. File Handler (JSON, for structured parsing later)
# Rotates every 500MB, keeps logs for 10 days
logger.add(
    settings.LOGS_DIR / "reelinsight.log",
    rotation="500 MB",
    retention="10 days",
    level="DEBUG",
    serialize=True 
)

# Export for use elsewhere
log = logger