import cv2
import json
import math
import shutil
import os
from pathlib import Path
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector
import ffmpeg
from concurrent.futures import ThreadPoolExecutor
from config import settings
from storage import storage
from logger import log

MAX_SCENE_INTERVAL = 10.0 
TARGET_HEIGHT = 360 

class VideoProcessor:
    def __init__(self, filename: str, cancel_callback=None):
        self.cancel_callback = cancel_callback
        self.filename = filename
        self.video_id = Path(filename).stem
        self.local_path = settings.TEMP_DIR / filename
        
        # 🛡️ STATELESS CHECK: 
        # If file is not in /tmp (e.g. Cloud Worker), fetch it from MinIO
        if not self.local_path.exists():
            log.info(f"📥 File missing locally. Fetching {filename} from MinIO...")
            try:
                storage.client.fget_object(
                    settings.MINIO_BUCKET, 
                    f"{self.video_id}/source.mp4", 
                    str(self.local_path)
                )
            except Exception as e:
                raise FileNotFoundError(f"Could not fetch video from MinIO: {e}")

    def extract_audio(self):
        local_audio_path = settings.TEMP_DIR / f"{self.video_id}.wav"
        minio_object_key = f"{self.video_id}/audio.wav"

        # Check Cloud First
        if storage.exists(minio_object_key):
             log.info("☁️ Audio found in MinIO. Skipping extraction.")
             # Ensure we have it locally for the Transcriber step later
             if not local_audio_path.exists():
                 storage.client.fget_object(settings.MINIO_BUCKET, minio_object_key, str(local_audio_path))
             return local_audio_path

        log.info(f"🔊 Extracting audio...")
        try:
            (
                ffmpeg
                .input(str(self.local_path))
                .output(str(local_audio_path), ac=1, ar='16000')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            storage.upload_file(str(local_audio_path), minio_object_key)
            return local_audio_path
        except ffmpeg.Error as e:
            log.error("❌ FFmpeg Audio Error:", e.stderr.decode('utf8'))
            raise e

    def extract_frames(self):
        video_frame_dir = settings.TEMP_DIR / self.video_id
        if video_frame_dir.exists(): shutil.rmtree(video_frame_dir)
        video_frame_dir.mkdir(parents=True, exist_ok=True)

        log.info(f"🎞️  Scanning Scenes...")
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=27.0))
        video = open_video(str(self.local_path))
        scene_manager.detect_scenes(video=video, show_progress=False)
        scene_list = scene_manager.get_scene_list()
        
        cap = cv2.VideoCapture(str(self.local_path))
        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Validate FPS
            if fps <= 0:
                raise ValueError(f"Invalid FPS: {fps}. Video may be corrupted.")
            
            duration = frame_count / fps

            if not scene_list:
                scene_list = [(type('obj', (object,), {'get_seconds': lambda: 0.0}),
                            type('obj', (object,), {'get_seconds': lambda: duration}))]

            frame_metadata = []
            count = 0

            for i, scene in enumerate(scene_list):
                # 🛑 NEW: Check for cancellation every scene
                if self.cancel_callback:
                    self.cancel_callback()

                start_sec = scene[0].get_seconds()
                end_sec = scene[1].get_seconds()
                duration_sec = end_sec - start_sec

                if duration_sec <= MAX_SCENE_INTERVAL:
                    timestamps = [start_sec + (duration_sec / 2)]
                else:
                    timestamps = [start_sec + (j * MAX_SCENE_INTERVAL) for j in range(math.ceil(duration_sec / MAX_SCENE_INTERVAL))]

                for target_ts in timestamps:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, int(target_ts * fps))
                    ret, frame = cap.read()
                    if ret:
                        h, w = frame.shape[:2]
                        new_w = int(TARGET_HEIGHT * (w / h))
                        frame_small = cv2.resize(frame, (new_w, TARGET_HEIGHT))
                        frame_name = f"frame_{count:04d}.jpg"
                        output_img_path = video_frame_dir / frame_name
                        cv2.imwrite(str(output_img_path), frame_small)

                        frame_metadata.append({
                            "filename": frame_name,
                            "timestamp": round(target_ts, 2),
                            "s3_key": f"{self.video_id}/frames/{frame_name}"
                        })
                        count += 1
        finally:
            cap.release()

        
        log.info(f"☁️ Uploading {count} frames (Parallel)...")
        
        def upload_frame(meta):
            local_file = video_frame_dir / meta["filename"]
            storage.upload_file(str(local_file), meta["s3_key"])

        # Upload 20 frames at a time
        with ThreadPoolExecutor(max_workers=20) as executor:
            executor.map(upload_frame, frame_metadata)

        json_path = video_frame_dir / "timestamps.json"
        with open(json_path, 'w') as f:
            json.dump(frame_metadata, f, indent=2)
        storage.upload_file(str(json_path), f"{self.video_id}/timestamps.json")
        
        return video_frame_dir

    def cleanup(self):
        """Wipes the temp video and frames to stay stateless"""
        log.info(f"🧹 Cleaning up temp files for {self.video_id}...")
        try:
            if self.local_path.exists(): os.remove(self.local_path)
            
            frames_dir = settings.TEMP_DIR / self.video_id
            if frames_dir.exists(): shutil.rmtree(frames_dir)
            
            audio_path = settings.TEMP_DIR / f"{self.video_id}.wav"
            if audio_path.exists(): os.remove(audio_path)
            
            # Remove audio json transcript if exists
            transcript_path = settings.TEMP_DIR / f"{self.video_id}.json"
            if transcript_path.exists(): os.remove(transcript_path)
            
        except Exception as e:
            log.error(f"⚠️ Cleanup Warning: {e}")

    def process(self):
        self.extract_audio()
        self.extract_frames()