<p align="center">
  <img src="https://img.shields.io/badge/🎬-ReelInsight-blueviolet?style=for-the-badge&labelColor=0d1117" alt="ReelInsight" />
</p>

<h1 align="center">ReelInsight</h1>

<p align="center">
  <strong>AI-Powered Multimodal Video Intelligence Platform</strong><br/>
  <em>Search, chat, and understand your video library using vision + speech AI — locally or in the cloud</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Celery-5.x-37814A?style=flat-square&logo=celery&logoColor=white" />
  <img src="https://img.shields.io/badge/Qdrant-DC382D?style=flat-square&logo=qdrant&logoColor=white" />
  <img src="https://img.shields.io/badge/MinIO-C72E49?style=flat-square&logo=minio&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=flat-square&logo=ollama&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white" />
</p>

<p align="center">
  <a href="#-quick-start">🚀 Quick Start</a> •
  <a href="#-architecture">🏗️ Architecture</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-api-reference">📡 API Reference</a> •
  <a href="#-tech-stack">🔧 Tech Stack</a> •
  <a href="#-roadmap">🗺️ Roadmap</a>
</p>

---

## 🧠 The Hook

ReelInsight turns any video library into a **searchable, queryable knowledge base** by combining **computer vision** and **speech transcription** into a unified multimodal search engine.

Upload a video (or paste a YouTube URL), and the system automatically:

→ **Extracts keyframes** using scene detection (PySceneDetect)  
→ **Transcribes audio** with Faster Whisper (distil-large-v3)  
→ **Embeds visuals** with OpenAI CLIP ViT-L/14 (768d vectors)  
→ **Embeds transcripts** with MiniLM-L6-v2 (384d vectors)  
→ **Fuses results** using Reciprocal Rank Fusion (RRF) for hybrid search  
→ **Generates QLoRA training data** automatically from processed content

Ask a question in the chat, and the AI answers **strictly from your video evidence** — with clickable timestamps to the exact moment.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                   │
│   Library │ Upload │ Search │ Chat │ Summary │ Video Player         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API (Axios)
┌────────────────────────────────▼────────────────────────────────────┐
│                        FASTAPI SERVER (:8000)                       │
│   /upload  /process_url  /search  /ask_ai  /summarize  /chapters   │
│   /stream  /videos  /progress  /cancel                             │
└──────┬──────────────┬───────────────┬──────────────┬───────────────┘
       │              │               │              │
  ┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
  │  Redis  │   │  Celery   │  │  Qdrant   │  │  MinIO  │
  │ :6379   │   │  Worker   │  │  :6333    │  │ :9000   │
  │Progress │   │           │  │ Vector DB │  │ Object  │
  │& Broker │   │  Pipeline │  │ CLIP+Text │  │ Storage │
  └─────────┘   └─────┬─────┘  └───────────┘  └─────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ Ingest  │  │Transcribe│  │ Embed    │
   │ Frames  │  │ Whisper  │  │CLIP+Mini │
   │ +Audio  │  │distil-v3 │  │ LM-L6-v2 │
   └─────────┘  └──────────┘  └──────────┘
                      │
              ┌───────▼────────┐
              │  LLM Engine    │
              │ Ollama / vLLM  │
              │ (Cloud or Local)│
              └────────────────┘
```

---

## ✨ Features

### 🎬 Video Ingestion
- **File Upload** — Drag & drop or browse (up to 500MB, `.mp4` `.avi` `.mov` `.mkv`)
- **YouTube URL** — Paste any YouTube link; yt-dlp handles download at ≤720p H.264
- **Bulk Ingestion** — CLI script to batch-process a list of URLs from `urls.txt`
- **Scene Detection** — PySceneDetect extracts intelligent keyframes at scene boundaries
- **Audio Extraction** — FFmpeg extracts 16kHz mono WAV for transcription
- **Cloud Storage** — All raw videos, frames, and transcripts persist in MinIO (S3-compatible)

### 🔍 Multimodal Search
- **Hybrid Vision + Text Search** — Queries run against both CLIP (visual) and MiniLM (transcript) indexes simultaneously
- **Reciprocal Rank Fusion** — Fair merging algorithm with configurable weights (2.0× vision, 1.5× text)
- **Hybrid Result Detection** — When visual and speech matches co-occur within ±2 seconds, results are tagged as `✨ Hybrid`
- **Per-Video Filtering** — Search across entire library or scope to a single video
- **Visual Frame Previews** — Search results include the matched frame thumbnail via presigned MinIO URLs

### 🤖 AI Chat & Analysis
- **RAG-Powered Q&A** — Ask questions answered strictly from video evidence with source citations
- **Recursive Summarization** — Handles unlimited-length videos via chunked summarization (12k char chunks)
- **Auto-Chapter Generation** — LLM generates timestamped table of contents from transcript
- **Video-Scoped Chat** — Filter AI conversations to a single video or query the entire library

### 🧠 ML Pipeline
- **CLIP ViT-L/14** — 768-dimensional visual embeddings with batch processing (batch size 4)
- **Faster Whisper distil-large-v3** — Quantized (INT8) speech-to-text on CPU with VAD filtering
- **MiniLM-L6-v2** — 384-dimensional sentence embeddings for transcript search (batch size 32)
- **QLoRA Data Generation** — Automatic synthesis of instruction-tuning pairs (Alpaca format) from processed videos
- **Model Caching** — Lazy-loaded ML models cached across Celery tasks to prevent redundant GPU/RAM allocation

### 🔌 LLM Backend (Dual-Mode)
- **Local (Ollama)** — Auto-detected on `localhost:11434` with dynamic model discovery
- **Cloud (vLLM)** — OpenAI-compatible API via SSH tunnel to remote GPU server
- **Auto-Failover** — `reel.sh` orchestrator probes cloud SSH → falls back to local Ollama if unreachable

### 📺 Video Player
- **MinIO Streaming** — Stateless video playback via presigned URL redirect (1hr expiry)
- **Timestamp Seeking** — Click any search result to jump directly to the matching moment
- **Custom Controls** — Play/pause, volume, rewind/forward, fullscreen via custom React player

### ⚙️ Infrastructure
- **Asynchronous Processing** — Celery worker handles the full pipeline without blocking the API
- **Real-Time Progress** — Redis-backed progress tracking polled by the frontend during processing
- **Cancellation Support** — Users can cancel in-progress jobs; worker checks Redis cancel flags between pipeline stages
- **Stateless Worker** — Worker fetches files from MinIO and cleans up temp files after each job
- **Structured Logging** — Loguru with console + rotating JSON file output (500MB rotation, 10-day retention)

---

## 🔧 Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 19, Vite 7, TailwindCSS 3, Framer Motion, Lucide Icons, Radix UI |
| **Backend** | Python 3.10, FastAPI, Uvicorn, Pydantic Settings |
| **Task Queue** | Celery 5 + Redis (broker & result backend) |
| **Vector DB** | Qdrant (dual collections: `vision_frames` 768d, `video_transcripts` 384d) |
| **Object Storage** | MinIO (S3-compatible, public-read bucket policy) |
| **Vision AI** | OpenAI CLIP ViT-L/14, PyTorch, TorchVision |
| **Speech AI** | Faster Whisper (distil-large-v3, INT8 on CPU), CTranslate2 |
| **Text AI** | Sentence-Transformers (all-MiniLM-L6-v2) |
| **LLM** | Ollama (local) / vLLM (cloud, OpenAI-compatible) |
| **Video Processing** | FFmpeg, OpenCV, PySceneDetect, yt-dlp |
| **Containerization** | Docker Compose (Qdrant, Redis, MinIO, Celery Worker) |
| **Logging** | Loguru (structured JSON + console) |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10** (via pyenv recommended)
- **Node.js 18+** and npm
- **Docker** and Docker Compose
- **FFmpeg** installed system-wide
- **Ollama** installed (for local LLM) → [ollama.com](https://ollama.com)
- **NVIDIA GPU** recommended (CLIP uses CUDA if available; Whisper runs on CPU)

### 1. Clone & Setup

```bash
git clone https://github.com/ashuxtim/ReelInsight.git
cd ReelInsight
```

### 2. Backend Setup

```bash
cd backend

# Create and activate Python env (pyenv recommended)
pyenv install 3.10
pyenv virtualenv 3.10 reelinsight-env
pyenv activate reelinsight-env

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Start Infrastructure

```bash
# From project root — starts Qdrant, Redis, MinIO, and Celery Worker
docker compose up -d
```

### 5. Pull an LLM Model

```bash
ollama pull qwen2.5-coder:7b
# Or any model you prefer — the engine auto-detects it
```

### 6. Launch Everything (Recommended)

```bash
# The smart orchestrator handles everything:
# Cloud check → Docker infra → Frontend → API → Worker logs
./reel.sh
```

<details>
<summary><strong>Manual Start (without orchestrator)</strong></summary>

```bash
# Terminal 1: API Server
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Docker services should already be running from step 4
```

</details>

### 🌐 Access Points

| Service | URL |
|:--------|:----|
| **Frontend UI** | `http://localhost:5173` |
| **API Server** | `http://localhost:8000` |
| **API Docs** | `http://localhost:8000/docs` |
| **Qdrant Dashboard** | `http://localhost:6333/dashboard` |
| **MinIO Console** | `http://localhost:9001` (admin: `minioadmin` / `minioadmin`) |

---

## 🔑 Environment Variables

| Variable | Default | Description |
|:---------|:--------|:------------|
| `LLM_BACKEND` | `local` | LLM mode: `local` (Ollama) or `cloud` (vLLM) |
| `LLM_API_URL` | `http://localhost:11434` | LLM endpoint URL |
| `LLM_API_KEY` | `ollama` | API key for cloud vLLM backend |
| `QDRANT_HOST` | Auto-detected | Qdrant hostname (`qdrant` in Docker, `localhost` outside) |
| `QDRANT_PORT` | `6333` | Qdrant port |
| `REDIS_HOST` | Auto-detected | Redis hostname |
| `MINIO_ENDPOINT` | Auto-detected | MinIO endpoint (`minio:9000` in Docker) |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `reelinsight` | MinIO bucket name |
| `MINIO_PUBLIC_ENDPOINT` | `localhost:9000` | Public-facing MinIO URL for presigned links |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker connection string |
| `VITE_API_URL` | `http://localhost:8000` | Frontend API base URL |

> **Note:** The backend uses `pydantic-settings` with auto-detection — infrastructure hostnames resolve dynamically between Docker and local environments. Manual configuration is rarely needed.

---

## 📡 API Reference

### Video Management

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/upload` | Upload a video file (multipart form) |
| `POST` | `/process_url` | Submit a YouTube URL for download + processing |
| `GET` | `/videos` | List all processed videos with thumbnails |
| `DELETE` | `/videos/{video_id}` | Delete video from storage, vector DB, and cache |
| `GET` | `/stream/{video_id}` | Redirect to presigned MinIO streaming URL |

### AI & Search

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/search?query=...&k=10&filter=...` | Multimodal hybrid search (vision + text) |
| `GET` | `/ask_ai?query=...&video_filter=...` | RAG-powered Q&A with source citations |
| `GET` | `/summarize?video_id=...` | Generate recursive video summary |
| `GET` | `/chapters?video_id=...` | Generate timestamped chapter list |

### Processing

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/progress/{filename}` | Real-time processing progress from Redis |
| `POST` | `/cancel/{filename}` | Cancel in-progress video processing |

---

## 🐳 Docker

The `docker-compose.yml` provisions four services:

| Service | Container | Purpose |
|:--------|:----------|:--------|
| **Qdrant** | `reel_qdrant` | Vector database (port 6333) |
| **Redis** | `reel_redis` | Task broker + progress store (port 6379) |
| **MinIO** | `reel_minio` | Object storage for videos/frames/transcripts (ports 9000, 9001) |
| **Worker** | `reel_celery` | Celery worker running the full ML pipeline |

```bash
# Start all infrastructure
docker compose up -d

# View worker logs (where processing happens)
docker compose logs -f worker

# Stop everything
docker compose stop
```

> The Celery Worker container is built from `backend/Dockerfile` — it includes FFmpeg, Git (for CLIP), and all Python dependencies.

---

## 📂 Folder Structure

```
ReelInsight/
├── backend/
│   ├── main.py              # FastAPI application & endpoints
│   ├── config.py            # Pydantic settings with auto-detection
│   ├── db.py                # Qdrant vector DB client (dual collections)
│   ├── worker.py            # Celery task: orchestrates the ML pipeline
│   ├── ingest.py            # Video processor: frame extraction + audio split
│   ├── embed_audio.py       # Faster Whisper transcription engine
│   ├── embed_text.py        # MiniLM-L6-v2 text embedding
│   ├── embed_vision.py      # CLIP ViT-L/14 visual embedding
│   ├── search_engine.py     # Hybrid search with Reciprocal Rank Fusion
│   ├── llm_engine.py        # Dual-mode LLM (Ollama/vLLM) + summarizer
│   ├── storage.py           # MinIO object storage client
│   ├── download.py          # yt-dlp YouTube downloader
│   ├── train.py             # QLoRA fine-tuning script (Unsloth + Qwen)
│   ├── evaluate.py          # Retrieval accuracy evaluation framework
│   ├── logger.py            # Loguru structured logging config
│   ├── Dockerfile           # Worker container image
│   ├── requirements.txt     # Python dependencies (pinned)
│   └── tests/               # Debug & evaluation test scripts
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main app with persistent state management
│   │   ├── config.js         # API URL configuration
│   │   └── components/
│   │       ├── Sidebar.jsx       # Navigation sidebar
│   │       ├── Header.jsx        # Top header bar
│   │       ├── VideoLibrary.jsx  # Video grid with thumbnails
│   │       ├── VideoPlayer.jsx   # Custom video player with seeking
│   │       ├── UploadSection.jsx # File upload + YouTube URL input
│   │       ├── SearchSection.jsx # Multimodal search interface
│   │       ├── ChatSection.jsx   # AI chat with source citations
│   │       ├── SummarySection.jsx# Video summarization view
│   │       └── ui/              # Reusable primitives (Toast, Dialog, etc.)
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docker-compose.yml        # Infrastructure services
├── reel.sh                   # Smart orchestrator (cloud/local switching)
├── bulk_ingest.py            # Batch YouTube URL processor
├── local_downloader.py       # Standalone video downloader utility
└── checklist.txt             # Development roadmap
```

---

## 🔒 Security Considerations

- **MinIO** defaults to `minioadmin/minioadmin` credentials — **change these in production**
- **CORS** is configured as `allow_origins=["*"]` — restrict to your domain in production
- **MinIO Bucket Policy** is set to public-read for frame thumbnails — review for sensitive content
- **LLM API Key** defaults to `"ollama"` — configure properly when using cloud vLLM
- **No authentication** is currently implemented on the FastAPI layer

---

## ⚡ Performance Notes

- **CLIP ViT-L/14** uses CUDA when available (~2GB VRAM); falls back to CPU
- **Faster Whisper** is forced to CPU with INT8 quantization for reliable performance on consumer hardware
- **MiniLM-L6-v2** runs on CPU by design — fast enough without GPU overhead
- **Frame Upload** uses 20-thread parallel upload to MinIO
- **Embedding Batching** — Vision processes 4 frames/batch, Text processes 32 segments/batch
- **Celery concurrency** is set to 1 worker to prevent GPU memory conflicts
- **ML Model Caching** keeps loaded models across tasks (no reload per video)

---

## 🗺️ Roadmap

Based on the project's development roadmap:

| Phase | Focus | Status |
|:------|:------|:-------|
| **Phase 1** | Hard negative mining, CLIP LoRA fine-tuning, hallucination grounding | Planned |
| **Phase 2** | Precision@K / Recall@K metrics dashboard, automated evaluation reports | Planned |
| **Phase 3** | Batch upload UI, timeline highlights, advanced search filters, chapters UI | Planned |
| **Phase 4** | SQL database migration, user access control & roles | Planned |
| **Phase 5** | Embedding cache, incremental indexing, retry logic | Planned |
| **Phase 6** | Electron desktop app, full Docker packaging, cloud deployment scripts | Planned |

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👤 Author

**Ashutosh Pathak**  
GitHub: [@ashuxtim](https://github.com/ashuxtim)

---

<p align="center">
  <sub>Built with ❤️ and way too much GPU time</sub>
</p>
