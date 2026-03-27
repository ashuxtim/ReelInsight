// components/VideoPlayer.jsx
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_URL } from '../config';

const VideoPlayer = ({ videoId, timestamp = 0, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(Number(timestamp) || 0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    let filename = String(videoId || "");
    if (!filename.endsWith(".mp4")) filename = `${filename}.mp4`;
    
    vid.src = `${API_URL}/stream/${encodeURIComponent(filename)}`;
    vid.currentTime = Math.max(0, Number(timestamp) || 0);
    
    const handlers = {
        meta: () => { setDuration(vid.duration); vid.play().catch(() => {}); setIsPlaying(true); },
        time: () => setCurrentTime(vid.currentTime || 0),
        end: () => setIsPlaying(false)
    };

    vid.addEventListener('loadedmetadata', handlers.meta);
    vid.addEventListener('timeupdate', handlers.time);
    vid.addEventListener('ended', handlers.end);

    return () => {
      vid.removeEventListener('loadedmetadata', handlers.meta);
      vid.removeEventListener('timeupdate', handlers.time);
      vid.removeEventListener('ended', handlers.end);
    };
  }, [videoId, timestamp]);

  const togglePlay = () => {
    if (videoRef.current?.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current?.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (s) => {
    if (isNaN(s)) return "00:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-slate-950 w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-800/50 shadow-2xl flex flex-col" 
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          
          {/* VIDEO AREA */}
          <div className="relative bg-black flex-1 min-h-0 flex justify-center items-center group">
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain" 
              onClick={togglePlay}
            />
            
            {/* Play Button Overlay */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.button 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={togglePlay} 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-6 rounded-full text-white border border-white/20 shadow-2xl"
                >
                  <Play size={48} fill="white" className="ml-1" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Top Bar - Video Title & Close */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: showControls ? 1 : 0 }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm p-4 flex justify-between items-center pointer-events-auto"
            >
              <h3 className="text-white font-semibold text-lg truncate max-w-[80%]">{videoId}</h3>
              <motion.button 
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 bg-red-500/20 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors border border-red-500/30"
              >
                <X size={20} />
              </motion.button>
            </motion.div>
          </div>

          {/* CONTROLS BAR */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 p-4"
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-400 font-mono w-12 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 relative group/progress">
                  <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={currentTime} 
                      onChange={(e) => { 
                        const newTime = Number(e.target.value);
                        videoRef.current.currentTime = newTime;
                        setCurrentTime(newTime);
                      }}
                      className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                      style={{
                        background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${progressPercent}%, rgb(30, 41, 59) ${progressPercent}%, rgb(30, 41, 59) 100%)`
                      }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono w-12">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-between items-center">
              
              {/* Left: Playback Controls */}
              <div className="flex items-center gap-3">
                <motion.button 
                  onClick={() => { videoRef.current.currentTime -= 10; }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                  <Rewind size={20}/>
                </motion.button>
                
                <motion.button 
                  onClick={togglePlay}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
                >
                  {isPlaying ? <Pause size={22} fill="white"/> : <Play size={22} fill="white"/>}
                </motion.button>
                
                <motion.button 
                  onClick={() => { videoRef.current.currentTime += 10; }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                  <FastForward size={20}/>
                </motion.button>

                <div className="h-6 w-px bg-slate-700 mx-2"></div>

                <motion.button 
                  onClick={toggleMute}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                  {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                </motion.button>
              </div>

              {/* Right: Additional Controls */}
              <div className="flex items-center gap-2">
                <motion.button 
                  onClick={() => videoRef.current?.requestFullscreen?.()}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                  title="Fullscreen"
                >
                  <Maximize2 size={18}/>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPlayer;