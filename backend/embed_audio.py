import json
import torch
from pathlib import Path
from faster_whisper import WhisperModel
from config import settings
from storage import storage
from logger import log

class AudioTranscriber:
    def __init__(self, model_size="distil-large-v3"): # 🚀 UPGRADE: Medium -> Distil-Large-v3
        # FORCE CPU: Reliable performance on Ryzen without VRAM crashes
        self.device = "cpu"
        self.compute_type = "int8" 
        
        log.info(f"🚀 Loading Whisper ({model_size}) on {self.device.upper()} (Int8)...")

        try:
            # This downloads the model automatically (~1.5GB first time)
            self.model = WhisperModel(model_size, device=self.device, compute_type=self.compute_type)
        except Exception as e:
            log.error(f"❌ Whisper Init Failed: {e}")
            raise
    
    def transcribe(self, video_id: str):
        filename = f"{video_id}.wav"
        audio_path = settings.TEMP_DIR / filename
        
        # 1. Fetch Audio if missing
        if not audio_path.exists():
            log.info(f"📥 Fetching audio for {video_id}...")
            try:
                storage.client.fget_object(settings.MINIO_BUCKET, f"{video_id}/audio.wav", str(audio_path))
            except Exception as e:
                log.error(f"❌ Audio fetch failed: {e}")
                raise FileNotFoundError(f"Audio not found: {video_id}")

        log.info(f"🎙️ Transcribing {filename}...")
        
        # 2. Transcribe
        # Beam size 1 is faster and usually sufficient for 'distil' models
        # vad_filter=True removes silence gaps automatically
        segments, info = self.model.transcribe(str(audio_path), beam_size=1, vad_filter=True)

        transcript_data = []
        for segment in segments:
            transcript_data.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })

        # 3. Save & Upload
        json_filename = f"{video_id}.json"
        json_path = settings.TEMP_DIR / json_filename
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2)
            
        storage.upload_file(str(json_path), f"{video_id}/transcript.json")
        log.info(f"✅ Transcription complete ({len(transcript_data)} segments).")
            
        return transcript_data

if __name__ == "__main__":
    pass