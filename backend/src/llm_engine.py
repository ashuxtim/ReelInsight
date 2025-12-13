import ollama
import json
from pathlib import Path
from src.config import AUDIO_OUTPUT_PATH

# CONFIG: Model Name
MODEL_NAME = "llama3.2:3b"

def get_transcript_path(video_id: str):
    """Finds the transcript in the unified processed_audio folder"""
    filename = f"{video_id}.json"
    path = AUDIO_OUTPUT_PATH / filename
    
    if path.exists(): 
        return path
    return None

def get_full_transcript(video_id: str) -> str:
    """Helper to load the full text from the JSON transcript"""
    transcript_path = get_transcript_path(video_id)
    
    if not transcript_path:
        print(f"❌ Transcript missing for: {video_id}")
        return None
        
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Robust loading (List vs Dict)
        segments = []
        if isinstance(data, list):
            segments = data
        elif isinstance(data, dict) and "segments" in data:
            segments = data["segments"]
        else:
            return None

        full_text = " ".join([seg.get('text', '') for seg in segments])
        return full_text

    except Exception as e:
        print(f"❌ Error reading transcript: {e}")
        return None

def summarize_video(video_id: str):
    print(f"🦙 Ollama: Summarizing {video_id}...")
    transcript = get_full_transcript(video_id)
    if not transcript: return "⚠️ Error: No transcript found. (Did you process the video?)"
    
    safe_transcript = transcript[:15000] # Truncate for RAM

    prompt = f"""
    You are an expert video analyst.
    Summarize this transcript.
    TRANSCRIPT: "{safe_transcript}..."
    Provide: 1. Main Topic (1 sentence) 2. Key Takeaways (Bullet points) 3. Detailed Summary
    """
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[{'role': 'user', 'content': prompt}])
        return response['message']['content']
    except Exception as e:
        return f"Ollama Error: {str(e)}"

def ask_question(query: str, search_results: list):
    print(f"🦙 Ollama: Answering '{query}'...")
    context_text = ""
    for r in search_results:
        # Check if it's a speech match to add text context
        if "Said:" in r.get("context", ""):
            text = r["context"].replace("Said:", "").strip()
            context_text += f"- At {r['timestamp']}s: {text}\n"
        # If it's a visual match, we can note that too
        elif "Visual" in r.get("type", ""):
             context_text += f"- At {r['timestamp']}s: [Visual Match] {r.get('context','')}\n"

    if not context_text: return "I didn't find enough context to answer."

    prompt = f"""
    Use these video snippets to answer the user question.
    QUESTION: "{query}"
    SNIPPETS:
    {context_text}
    Answer strictly based on snippets.
    """
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[{'role': 'user', 'content': prompt}])
        return response['message']['content']
    except Exception as e:
        return f"Ollama Error: {str(e)}"

def generate_chapters(video_id: str):
    """Generates timestamped chapters using LLM"""
    print(f"🦙 Ollama: Generating chapters for {video_id}...")
    transcript = get_full_transcript(video_id)
    if not transcript: return []

    safe_transcript = transcript[:15000]

    prompt = f"""
    Create a Table of Contents for this transcript.
    Identify 5-8 distinct topics with start timestamps.
    TRANSCRIPT: "{safe_transcript}..."
    RULES:
    1. Format exactly: "MM:SS - Topic Title"
    2. No intro/outro text.
    3. Start with "00:00 - Introduction"
    """
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[{'role': 'user', 'content': prompt}])
        raw_text = response['message']['content']
        
        chapters = []
        for line in raw_text.split('\n'):
            if " - " in line and line[0].isdigit():
                parts = line.split(" - ", 1)
                time_str = parts[0].strip()
                title = parts[1].strip()
                try:
                    m, s = map(int, time_str.split(':'))
                    seconds = m * 60 + s
                    chapters.append({"time_str": time_str, "seconds": seconds, "title": title})
                except: continue
        return chapters
    except Exception as e:
        print(f"Chapter Error: {e}")
        return []