import json
from pathlib import Path
from faster_whisper import WhisperModel
from src.config import AUDIO_OUTPUT_PATH

class AudioTranscriber:
    def __init__(self, model_size="base"):
        """
        Loads the Whisper model.
        """
        print(f"🧠 Loading Faster-Whisper ({model_size}) model on CPU...")
        # int8 is the key for speed
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    def transcribe(self, filename: str):
        audio_path = AUDIO_OUTPUT_PATH / filename
        if not audio_path.exists():
            print(f"❌ Audio not found: {audio_path}")
            return

        print(f"🎙️ Transcribing {filename}...")
        
        # OPTIMIZATION: beam_size=1 (Greedy search) is much faster
        segments, info = self.model.transcribe(str(audio_path), beam_size=1)

        # Convert generator to list
        transcript_data = []
        for segment in segments:
            transcript_data.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })

        json_path = audio_path.with_suffix('.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2)
            
        print(f"✅ Transcription saved to {json_path}")
        return transcript_data

if __name__ == "__main__":
    transcriber = AudioTranscriber(model_size="base")
    wav_files = list(AUDIO_OUTPUT_PATH.glob("*.wav"))
    for wav in wav_files:
        transcriber.transcribe(wav.name)