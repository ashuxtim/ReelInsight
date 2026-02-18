import sys
import os
import json
import re
from config import settings
from storage import storage
# We import only the connection helper, but define the logic here
from llm_engine import call_llm, get_full_transcript, MODEL_NAME

# ✅ FORCE VIDEO ID
VIDEO_ID = "1770192383_10_Important_Python_Concepts_In_20_Minutes"

def debug_generate():
    print(f"🔍 Debugging Model: {MODEL_NAME}")
    
    transcript = get_full_transcript(VIDEO_ID)
    if not transcript:
        print("❌ Error: Transcript not found. Run the extraction steps first.")
        return

    # Take just the first 2000 characters to test quickly
    chunk = transcript[:2000]
    
    print(f"📝 Text Snippet (First 100 chars): {chunk[:100]}...")
    
    prompt = f"""
    Analyze this text and generate 3 Q&A pairs.
    
    STRICT OUTPUT FORMAT (JSON LIST ONLY):
    [
        {{"q": "Question?", "a": "Answer."}},
        {{"q": "Question?", "a": "Answer."}}
    ]
    
    RULES:
    1. Do NOT write "Here is the JSON" or markdown ticks.
    2. Just output the raw list starting with [.
    
    TEXT:
    "{chunk}"
    """
    
    print("\n⏳ Sending request to LLM...")
    response_text = call_llm([{'role': 'user', 'content': prompt}], json_mode=True)
    
    print("\n" + "="*40)
    print("🛑 RAW LLM RESPONSE (COPY THIS):")
    print("="*40)
    print(response_text)
    print("="*40 + "\n")

    # TEST THE EXTRACTOR
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        match = re.search(r'\[.*\]', clean_text, re.DOTALL)
        
        if match:
            print("✅ SUCCESS! Regex found the JSON list.")
            data = json.loads(match.group(0))
            print(f"📊 Parsed {len(data)} pairs successfully.")
            print(json.dumps(data, indent=2))
        else:
            print("❌ FAILURE: Regex could not find [...] in the response.")
    except Exception as e:
        print(f"❌ PARSE ERROR: {e}")

if __name__ == "__main__":
    debug_generate()