# Use Python 3.10 Lite
FROM python:3.10-slim

# 1. Install System Dependencies
# Added 'git' so we can install OpenAI CLIP
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Work Directory
WORKDIR /app

# 3. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy Application Code
COPY . .

# Default command
CMD ["celery", "-A", "worker.celery_app", "worker", "--loglevel=INFO"]