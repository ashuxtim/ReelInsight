import streamlit as st
import sys
import os
import requests
import time
from pathlib import Path

# --- 1. PATH SETUP (Critical for "No module named src") ---
current_dir = Path(__file__).resolve().parent  # app/
root_dir = current_dir.parent                  # ReelInsight/
sys.path.append(str(root_dir))

from src.config import VIDEO_INPUT_PATH

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")
st.set_page_config(page_title="ReelInsight", page_icon="🎬", layout="wide")

# --- SIDEBAR ---
with st.sidebar:
    st.header("📤 Add Video")
    
    tab1, tab2 = st.tabs(["📁 File", "🌐 URL"])
    
    # File Upload
    with tab1:
        uploaded_file = st.file_uploader("Choose a video", type=['mp4'])
        if uploaded_file and st.button("Upload & Process 🚀"):
            files = {"file": (uploaded_file.name, uploaded_file, uploaded_file.type)}
            res = requests.post(f"{API_URL}/upload", files=files)
            if res.status_code == 200:
                st.session_state['active_file'] = res.json()["filename"]
                st.rerun()

    # URL Input
    with tab2:
        url = st.text_input("YouTube Link")
        if url and st.button("Download & Process 🌐"):
            res = requests.post(f"{API_URL}/process_url", json={"url": url})
            if res.status_code == 200:
                st.session_state['active_file'] = res.json()["filename"]
                st.rerun()

    # Progress Bar
    if 'active_file' in st.session_state:
        fname = st.session_state['active_file']
        st.divider()
        st.write(f"**Processing:** {fname}")
        
        prog_bar = st.progress(0)
        status_text = st.empty()
        
        while True:
            time.sleep(1)
            try:
                data = requests.get(f"{API_URL}/progress/{fname}").json()
                pct = data.get("percent", 0)
                status = data.get("status", "Waiting...")
                
                prog_bar.progress(pct)
                status_text.write(status)
                
                if pct == 100:
                    st.success("Done!")
                    time.sleep(2)
                    del st.session_state['active_file']
                    st.rerun()
                    break
                if pct == -1:
                    st.error(f"Failed: {status}")
                    break
            except:
                break

    st.divider()
    # Filter
    try:
        vid_res = requests.get(f"{API_URL}/videos").json()
        videos = ["All Videos"] + vid_res["videos"]
    except:
        videos = ["All Videos"]
    selected_video = st.selectbox("Current Video:", videos)

# --- MAIN ---
st.title("🎬 ReelInsight")

tab_search, tab_chat, tab_sum = st.tabs(["🔍 Search", "💬 Chat", "📝 Summary"])

with tab_search:
    query = st.text_input("Search visual or audio content...")
    if st.button("Search 🔍") and query:
        params = {"query": query, "filter": selected_video}
        results = requests.get(f"{API_URL}/search", params=params).json()["results"]
        
        if not results:
            st.warning("No matches found.")
        
        for r in results:
            # 1. Display Score & Time
            st.markdown(f"### Found at {r['timestamp']}s")
            st.caption(f"Type: {r['type']} | Confidence: {r['score']:.2f}")
            if "context" in r: 
                st.info(f"Context: {r['context']}")
            
            # 2. Display Image & Video Side-by-Side
            col1, col2 = st.columns([1, 1])
            
            with col1:
                # Show Frame Image
                if os.path.exists(r['frame_path']):
                    # --- FIXED WARNING HERE: Used width="stretch" ---
                    st.image(r['frame_path'], caption="Matched Frame") 
                else:
                    st.warning("Frame image missing.")
                    st.error(f"Missing File!")
                    st.caption(f"Looking for: `{r['frame_path']}`")
            
            with col2:
                # Play Video Segment
                video_filename = f"{r['video_id']}.mp4"
                video_path = VIDEO_INPUT_PATH / video_filename
                
                if video_path.exists():
                    st.video(str(video_path), start_time=int(r['timestamp']))
                else:
                    st.error(f"Video file not found: {video_filename}")
            
            st.divider()

with tab_chat:
    q = st.text_input("Ask about the video...")
    if st.button("Ask AI 🤖") and q:
        with st.spinner("AI is thinking..."):
            res = requests.get(f"{API_URL}/ask_ai", params={"query": q, "video_filter": selected_video}).json()
            st.markdown(res["answer"])
            
            with st.expander("View Evidence"):
                for item in res["context"]:
                     st.write(f"- {item['timestamp']}s: {item.get('context', 'Visual Match')}")

with tab_sum:
    if st.button("Generate Summary 📝"):
        if selected_video == "All Videos":
            st.warning("Select a specific video first.")
        else:
            with st.spinner("Summarizing (This uses the GPU)..."):
                res = requests.get(f"{API_URL}/summarize", params={"video_id": selected_video}).json()
                st.markdown(res["summary"])