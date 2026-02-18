#!/bin/bash

# ==========================================
# 🎥 ReelInsight Smart Orchestrator v2.0
# ==========================================

CLOUD_IP="164.52.194.28"
SSH_KEY="~/.ssh/id_documind"

# PORTS
CLOUD_PORT="8002"       # Dedicated port for Cloud vLLM
LOCAL_TUNNEL="8002"     # Local mapping
OLLAMA_PORT="11434"

# COLORS
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# --- 1. CLEANUP TRAP (The Kill Switch) ---
cleanup() {
    echo -e "\n${RED}🛑 Shutting down everything...${NC}"
    
    # Kill Local Background Processes
    if [ -n "$API_PID" ]; then kill $API_PID 2>/dev/null; fi
    if [ -n "$UI_PID" ]; then kill $UI_PID 2>/dev/null; fi
    pkill -f "autossh.*$CLOUD_PORT"
    
    # Stop Docker Containers (Worker/DBs)
    echo -e "${YELLOW}🐳 Stopping Docker Containers...${NC}"
    docker compose stop
    
    echo -e "${GREEN}✅ System Stopped Cleanly.${NC}"
    exit
}
trap cleanup SIGINT

# --- 2. ENVIRONMENT SETUP ---
echo -e "${GREEN}🎬 Starting ReelInsight System${NC}"

# Load Python Environment
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
pyenv activate reelinsight-env

# Kill any rogue processes from before
pkill -f "uvicorn"
pkill -f "celery" 

# --- 3. CLOUD CHECK & TUNNEL ---
echo -e "${YELLOW}📡 Checking Cloud Connection...${NC}"

if ssh -q -o BatchMode=yes -o ConnectTimeout=2 -i $SSH_KEY root@$CLOUD_IP exit; then
    echo "   ☁️  Cloud Online. Establishing Tunnel..."
    
    autossh -M 0 -f -N \
        -o "ServerAliveInterval 30" \
        -o "ExitOnForwardFailure=yes" \
        -i $SSH_KEY \
        -L ${LOCAL_TUNNEL}:localhost:${CLOUD_PORT} \
        root@$CLOUD_IP
        
    echo "   🔗 Tunnel Active (Port $LOCAL_TUNNEL)"
    
    export LLM_BACKEND="cloud"
    export LLM_API_URL="http://localhost:$LOCAL_TUNNEL/v1"
    export LLM_API_KEY="token-not-needed" 

else
    echo "   ⚠️  Cloud Unreachable. Fallback to Local (Ollama)."
    
    # Start Ollama if not running
    if ! pgrep -x "ollama" > /dev/null; then
        ollama serve > /dev/null 2>&1 &
    fi
    
    export LLM_BACKEND="local"
    export LLM_API_URL="http://localhost:$OLLAMA_PORT"
fi

# --- 4. START INFRASTRUCTURE (Docker) ---
echo -e "${YELLOW}🐳 Starting Database & Time-Synced Worker...${NC}"
# We start the worker here via Docker, so no need for 'celery' command below
docker compose up -d

# --- 5. START FRONTEND (Hidden) ---
echo -e "${BLUE}💻 Starting Frontend...${NC}"
cd frontend
# Run silently in background to keep terminal clean
npm run dev > /dev/null 2>&1 &
UI_PID=$!
cd ..
echo -e "   ✅ UI: http://localhost:5173"

# --- 6. START API (With Log Filtering) ---
echo -e "${BLUE}🔌 Starting API Server...${NC}"
cd backend
# 🚀 SMART LOGS: Grep filters out the polling noise so you only see errors/info
# --line-buffered ensures logs appear instantly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1 | grep --line-buffered -v -E "GET /progress|GET /videos|GET /chapters|GET /stream" &
API_PID=$!
cd ..
echo -e "   ✅ API: http://localhost:8000"

# --- 7. LIVE LOG STREAMING ---
echo -e "\n${GREEN}🚀 System is Live! Streaming Worker Logs...${NC}"
echo -e "${YELLOW}(Press Ctrl+C to Stop Everything)${NC}\n"

# Follow the Docker Worker logs (This is where the video processing happens)
# This keeps the script running until you hit Ctrl+C
docker compose logs -f worker

# Fallback wait
wait