import json
import time
from pathlib import Path
from main import search_engine, ask_question
from logger import log
from config import settings

# Load Search Engine Manually (since we aren't running the full API)
if search_engine is None:
    from search_engine import VideoSearchEngine
    search_engine = VideoSearchEngine()

def run_evaluation():
    dataset_path = Path("test_dataset.json")
    if not dataset_path.exists():
        log.error("❌ No test dataset found!")
        return

    with open(dataset_path, "r") as f:
        tests = json.load(f)

    log.info(f"📉 Starting Evaluation on {len(tests)} questions...")
    
    total_score = 0
    
    for test in tests:
        q = test["question"]
        vid_id = test["video_id"]
        target_ts = test["correct_timestamp"]
        keywords = test["correct_answer_keywords"]
        
        log.info(f"❓ Testing: '{q}'")
        
        # 1. Run Retrieval
        results = search_engine.search(q, k=5, video_filter=vid_id)
        
        # 2. Check Retrieval Accuracy (Did we find a chunk near the timestamp?)
        hit_found = False
        retrieved_ts = []
        for res in results:
            ts = int(res["timestamp"])
            retrieved_ts.append(ts)
            # Allow a +/- 30 second buffer
            if abs(ts - target_ts) <= 30:
                hit_found = True
        
        # 3. Check Generation Quality (Did the LLM mention keywords?)
        answer = ask_question(q, results)
        keyword_hits = [k for k in keywords if k.lower() in answer.lower()]
        
        # Scoring
        score = 0
        if hit_found: score += 50  # 50 points for finding the clip
        if len(keyword_hits) > 0: score += 50 # 50 points for mentioning keywords
        
        total_score += score
        
        log.info(f"   👉 Retrieval: {'✅' if hit_found else '❌'} (Found: {retrieved_ts} vs Target: {target_ts})")
        log.info(f"   👉 Answer: {'✅' if len(keyword_hits)>0 else '❌'} (Keywords: {keyword_hits})")
        log.info(f"   🏆 Score: {score}/100")
        log.info("-" * 30)

    avg_score = total_score / len(tests)
    log.info(f"📊 FINAL REPORT: Average System Accuracy = {avg_score:.1f}%")

if __name__ == "__main__":
    run_evaluation()