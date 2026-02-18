import os
import json
import logging
import re
from pathlib import Path
from config import settings
from storage import storage
from logger import log

# ==========================================
# 🔌 BACKEND SETUP (Cloud vs Local)
# ==========================================

BACKEND_MODE = os.getenv("LLM_BACKEND", "local")  # 'local' or 'cloud'
API_URL = os.getenv("LLM_API_URL", "http://localhost:11434")
API_KEY = os.getenv("LLM_API_KEY", "ollama")

log.info(f"🧠 LLM Engine initializing in mode: {BACKEND_MODE.upper()} ({API_URL})")

client = None
MODEL_NAME = ""

# ==========================================
# 🔍 DYNAMIC MODEL DETECTION
# ==========================================
def get_active_model():
    """
    Connects to the active backend (Cloud or Local) and asks for the running model name.
    Returns the exact ID string (e.g., 'Qwen/Qwen2.5-Coder-7B-Instruct').
    """
    global client
    
    try:
        if BACKEND_MODE == "cloud":
            # --- CLOUD (vLLM via OpenAI Protocol) ---
            from openai import OpenAI
            client = OpenAI(base_url=API_URL, api_key=API_KEY)
            
            log.info("📡 Contacting Cloud Brain...")
            models = client.models.list()
            
            # vLLM usually returns the loaded model as the first item
            if models.data:
                true_name = models.data[0].id
                log.info(f"✅ Cloud Connected. Model Identity: {true_name}")
                return true_name
            else:
                log.warning("⚠️ Cloud connected but returned no models list.")
                return "default-cloud-model"

        else:
            # --- LOCAL (Ollama Native) ---
            from ollama import Client
            client = Client(host=API_URL)
            
            log.info("🦙 Contacting Local Ollama...")
            list_response = client.list()
            
            # Robust extraction (Object vs Dict support)
            models_list = []
            if hasattr(list_response, 'models'):
                models_list = list_response.models
            elif isinstance(list_response, dict) and 'models' in list_response:
                models_list = list_response['models']
            
            if not models_list:
                log.error("❌ Ollama is running but has NO models. Run 'ollama pull <model>'.")
                return None

            first = models_list[0]
            true_name = first.model if hasattr(first, 'model') else first.get('model')
            
            log.info(f"✅ Local Ollama Connected. Model Identity: {true_name}")
            return true_name

    except Exception as e:
        log.error(f"❌ Failed to connect to AI Backend: {e}")
        return None

# 🔥 INITIALIZE IMMEDIATELY
MODEL_NAME = get_active_model()


# ==========================================
# 🛠️ HELPER: The "Bilingual" Wrapper
# ==========================================
def call_llm(messages, max_tokens=2000, json_mode=False):
    """
    Executes the prompt on whichever backend is active.
    """
    if not MODEL_NAME: 
        log.error("⚠️ Cannot call LLM: No model loaded.")
        return None

    try:
        if BACKEND_MODE == "cloud":
            # vLLM / OpenAI Call
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
                response_format={"type": "json_object"} if json_mode else None
            )
            return response.choices[0].message.content
            
        else:
            # Ollama Call
            response = client.chat(
                model=MODEL_NAME, 
                messages=messages, 
                format="json" if json_mode else ""
            )
            # Handle Object vs Dict return style
            return response.message.content if hasattr(response, 'message') else response['message']['content']
            
    except Exception as e:
        log.error(f"LLM Call Failed: {e}")
        return None


# ==========================================
# 📂 TRANSCRIPT UTILS
# ==========================================
def get_full_transcript(video_id: str) -> str:
    """Retrieves transcript from MinIO or Local Temp"""
    json_path = settings.TEMP_DIR / f"{video_id}.json"
    
    # 1. Fetch from Cloud if missing
    if not json_path.exists():
        try:
            storage.client.fget_object(settings.MINIO_BUCKET, f"{video_id}/transcript.json", str(json_path))
        except:
            try:
                storage.client.fget_object(settings.MINIO_BUCKET, f"{video_id}.json", str(json_path))
            except: return ""

    # 2. Read
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        segments = data if isinstance(data, list) else data.get("segments", [])
        return " ".join([seg.get('text', '').strip() for seg in segments])
    except: return ""


# ==========================================
# 🧠 CORE FUNCTIONS
# ==========================================
def recursive_summarize(text: str, chunk_size=12000):
    """
    Splits long text into chunks, summarizes each, then combines them.
    This allows infinite-length video summarization on limited RAM.
    """
    if len(text) < chunk_size:
        # Short enough for one pass
        return _generate_summary_pass(text, "detailed")
    
    # 1. Split into chunks
    chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
    log.info(f"📚 Transcript too long. Split into {len(chunks)} chunks for recursive summary.")
    
    partial_summaries = []
    for i, chunk in enumerate(chunks):
        log.info(f"   ↳ Summarizing chunk {i+1}/{len(chunks)}...")
        summary = _generate_summary_pass(chunk, "brief")
        if summary:
            partial_summaries.append(summary)
            
    # 2. Combine and Finalize
    combined_text = "\n".join(partial_summaries)
    log.info("📑 Generating Master Summary from chunks...")
    return _generate_summary_pass(combined_text, "detailed")

def _generate_summary_pass(text, mode="detailed"):
    if mode == "detailed":
        instructions = "Provide: 1. Main Topic (1 sentence) 2. Key Takeaways (Bullet points) 3. Detailed Summary"
    else:
        instructions = "Provide a concise paragraph summary of this section."
        
    prompt = f"""
    You are an expert analyst. Summarize this transcript.
    TRANSCRIPT: "{text}"
    INSTRUCTIONS: {instructions}
    """
    return call_llm([{'role': 'user', 'content': prompt}])


def summarize_video(video_id: str):
    if not MODEL_NAME: return "⚠️ Error: No AI model connected."
    transcript = get_full_transcript(video_id)
    if not transcript: return "⚠️ Error: No transcript found."
    
    # Use the new recursive logic
    return recursive_summarize(transcript) or "Failed to generate summary."


def ask_question(query: str, search_results: list):
    if not MODEL_NAME: return "⚠️ Error: No AI model connected."
    
    context_text = ""
    for r in search_results:
        timestamp = r.get('timestamp', '??')
        # We now have rich context from search_engine.py
        text = r.get("context", "")
        # Remove metadata labels if present to save tokens
        text = text.replace("Said:", "").replace("Visual Match", "").strip()
        context_text += f"- At {timestamp}s: {text}\n"

    if not context_text: return "I didn't find enough context in the video."

    prompt = f"""
    Answer the user question strictly based on the video snippets below.
    
    QUESTION: "{query}"
    
    EVIDENCE FROM VIDEO:
    {context_text}
    
    If the answer is not in the evidence, say "I couldn't find that in the video."
    """
    return call_llm([{'role': 'user', 'content': prompt}]) or "Failed to generate answer."


def generate_chapters(video_id: str):
    if not MODEL_NAME: return []
    transcript = get_full_transcript(video_id)
    if not transcript: return []
    
    # We take the first 15k chars for chapter generation (usually sufficient for structure)
    prompt = f"""
    Create a Table of Contents for this transcript.
    TRANSCRIPT START: "{transcript[:15000]}..."
    
    RULES:
    1. Output STRICTLY lines formatted: "MM:SS - Topic Title"
    2. Start with "00:00 - Introduction"
    """
    raw_text = call_llm([{'role': 'user', 'content': prompt}])
    if not raw_text: return []
    
    chapters = []
    for line in raw_text.split('\n'):
        if " - " in line and len(line) > 7 and line[0].isdigit():
            try:
                parts = line.split(" - ", 1)
                time_str = parts[0].strip()
                title = parts[1].strip()
                time_parts = list(map(int, time_str.split(':')))
                if len(time_parts) == 2: seconds = time_parts[0] * 60 + time_parts[1]
                elif len(time_parts) == 3: seconds = time_parts[0] * 3600 + time_parts[1] * 60 + time_parts[2]
                else: continue
                chapters.append({"time_str": time_str, "seconds": seconds, "title": title})
            except: continue
    return chapters


# ==========================================
# 🧪 SYNTHETIC DATA GENERATOR
# ==========================================

def generate_synthetic_data(video_id: str):
    if not MODEL_NAME: return
    
    transcript = get_full_transcript(video_id)
    if not transcript or len(transcript) < 500: return

    log.info(f"🧪 Generating QLoRA Data for {video_id}...")
    
    chunk_size = 2000
    overlap = 200
    chunks = []
    
    for i in range(0, len(transcript), chunk_size - overlap):
        chunks.append(transcript[i : i + chunk_size])

    dataset_path = settings.LOGS_DIR / "training_dataset.jsonl"
    total_pairs = 0

    for i, chunk in enumerate(chunks):
        log.info(f"   ↳ Processing Chunk {i+1}/{len(chunks)}...")
        
        prompt = f"""
        Analyze this code/text and generate 3 Q&A pairs.
        
        STRICT OUTPUT FORMAT:
        [
            {{"q": "Question?", "a": "Answer with code if applicable."}},
            {{"q": "Question?", "a": "Answer."}}
        ]
        
        RULES:
        1. Output STRICTLY a valid JSON List.
        2. Do NOT write "Here is the JSON".
        
        TEXT:
        "{chunk}"
        """
        
        response_text = call_llm([{'role': 'user', 'content': prompt}], json_mode=True)
        if not response_text: continue

        try:
            # 🧹 Clean Markdown
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            
            data = []
            
            # 🔎 STRATEGY 1: Look for a List [...]
            match_list = re.search(r'\[.*\]', clean_text, re.DOTALL)
            
            # 🔎 STRATEGY 2: Look for a Single Object {...} (Fallback)
            match_single = re.search(r'\{.*\}', clean_text, re.DOTALL)

            if match_list:
                data = json.loads(match_list.group(0))
            elif match_single:
                # 🚑 The "Qwen Fix": Wrap single object in a list
                single_obj = json.loads(match_single.group(0))
                data = [single_obj]
                log.info(f"     🔧 Auto-corrected Single JSON Object to List.")
            else:
                log.warning(f"     ⚠️ Chunk {i+1}: No JSON found.")
                continue

            # Ensure it's a list
            if isinstance(data, dict): data = [data]
            
            # Extract Pairs
            valid_count = 0
            with open(dataset_path, "a", encoding="utf-8") as f:
                for p in data:
                    q = p.get('q') or p.get('question')
                    a = p.get('a') or p.get('answer')
                    
                    if q and a:
                        entry = {
                            "instruction": q, 
                            "input": "", 
                            "output": a, 
                            "source_video": video_id
                        }
                        f.write(json.dumps(entry) + "\n")
                        valid_count += 1
                        total_pairs += 1
            
            if valid_count > 0:
                log.info(f"     ✅ Extracted {valid_count} pairs from Chunk {i+1}")

        except Exception as e:
            log.error(f"     ❌ Chunk {i+1} Error: {e}")
            
        if total_pairs >= 20: break 
        
    log.info(f"✅ Finished. Total Pairs Generated: {total_pairs}")