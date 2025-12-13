import cv2
import sys
import json
import math
import shutil
from pathlib import Path
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
from src.config import VIDEO_INPUT_PATH, AUDIO_OUTPUT_PATH, FRAMES_OUTPUT_PATH
import ffmpeg

# CONFIG
MAX_SCENE_INTERVAL = 10.0 
TARGET_HEIGHT = 360 

class VideoProcessor:
    def __init__(self, filename: str):
        self.filename = filename
        self.input_path = VIDEO_INPUT_PATH / filename
        self.video_id = self.input_path.stem
        
        if not self.input_path.exists():
            raise FileNotFoundError(f"Video file not found: {self.input_path}")

    def extract_audio(self):
        output_path = AUDIO_OUTPUT_PATH / f"{self.video_id}.wav"
        if output_path.exists():
            print("🔊 Audio already exists. Skipping.")
            return output_path

        print(f"🔊 Extracting audio...")
        try:
            (
                ffmpeg
                .input(str(self.input_path))
                .output(str(output_path), ac=1, ar='16000')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return output_path
        except ffmpeg.Error as e:
            print("❌ FFmpeg Audio Error:", e.stderr.decode('utf8'))
            # Don't exit, just raise so pipeline catches it
            raise e 

    def extract_frames(self):
        video_frame_dir = FRAMES_OUTPUT_PATH / self.video_id
        if video_frame_dir.exists(): shutil.rmtree(video_frame_dir)
        video_frame_dir.mkdir(parents=True, exist_ok=True)

        print(f"🎞️  Smart-Scanning {self.filename}...")

        # 1. Detect Scenes
        print("   ... Analyzing scenes (This uses CPU, please wait)...")
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=27.0))
        video = open_video(str(self.input_path))
        
        # --- NEW: Catch scene detection stats ---
        scene_manager.detect_scenes(video=video, show_progress=False) # Disable built-in bar to keep logs clean
        scene_list = scene_manager.get_scene_list()
        print(f"   ✅ Found {len(scene_list)} scenes.")
        
        # 2. Setup Video Reading
        cap = cv2.VideoCapture(str(self.input_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps else 0

        if not scene_list:
            scene_list = [(
                type('obj', (object,), {'get_seconds': lambda: 0.0}),
                type('obj', (object,), {'get_seconds': lambda: duration})
            )]

        frame_metadata = []
        count = 0
        
        print("   ... Saving Frames ...")
        for i, scene in enumerate(scene_list):
            start_sec = scene[0].get_seconds()
            end_sec = scene[1].get_seconds()
            duration_sec = end_sec - start_sec
            
            if duration_sec <= MAX_SCENE_INTERVAL:
                timestamps = [start_sec + (duration_sec / 2)]
            else:
                num_segments = math.ceil(duration_sec / MAX_SCENE_INTERVAL)
                timestamps = [start_sec + (j * MAX_SCENE_INTERVAL) for j in range(num_segments)]

            for target_ts in timestamps:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(target_ts * fps))
                ret, frame = cap.read()
                
                if ret:
                    # Resize
                    h, w = frame.shape[:2]
                    aspect_ratio = w / h
                    new_w = int(TARGET_HEIGHT * aspect_ratio)
                    frame_small = cv2.resize(frame, (new_w, TARGET_HEIGHT))
                    
                    frame_name = f"frame_{count:04d}.jpg"
                    output_img_path = video_frame_dir / frame_name
                    cv2.imwrite(str(output_img_path), frame_small)
                    
                    frame_metadata.append({
                        "filename": frame_name,
                        "timestamp": round(target_ts, 2)
                    })
                    count += 1
            
            # Print heartbeat every 10 scenes
            if i % 10 == 0:
                print(f"   scanned scene {i}/{len(scene_list)}")
                
        cap.release()
        
        with open(video_frame_dir / "timestamps.json", 'w') as f:
            json.dump(frame_metadata, f, indent=2)

        print(f"✅ Stored {count} optimized frames to disk.")
        return video_frame_dir

    def process(self):
        self.extract_audio()
        self.extract_frames()