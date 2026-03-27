// components/VideoLibrary.jsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, Trash2, MessageSquare, Film } from 'lucide-react';
import axios from 'axios';
import { useToast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { API_URL } from '../config';

const VideoLibrary = ({ videos, setVideos, onPlay, onChat, refreshLibrary }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const { addToast } = useToast();

  // ============ HELPER: Clean Video Name ============
  const getCleanVideoName = (video) => {
    const name = video.title || video.id || 'Untitled Video';
    
    // Remove timestamp prefix
    const withoutTimestamp = name.replace(/^\d{10,}_|^\d{10,}-/, '');
    
    // Replace underscores and hyphens with spaces
    const readable = withoutTimestamp.replace(/[_-]/g, ' ');
    
    // Title case
    return readable.split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim() || 'Untitled Video';
  };

  // ============ HELPER: Format Date ============
  const getTimeAgo = (video) => {
    const match = (video.id || '').match(/^(\d{10})/);
    if (!match) return 'Recently';
    
    const timestamp = parseInt(match[1]);
    const videoDate = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - videoDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    
    return videoDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // ============ CLIENT-SIDE FILTERING ============
  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    const lowerQ = searchQuery.toLowerCase();
    return videos.filter(v => {
      const cleanName = getCleanVideoName(v).toLowerCase();
      const rawName = (v.title || v.id || '').toLowerCase();
      return cleanName.includes(lowerQ) || rawName.includes(lowerQ);
    });
  }, [videos, searchQuery]);

  // ============ DELETE HANDLERS ============
  const confirmDelete = (video, e) => {
    e.stopPropagation();
    setVideoToDelete(video);
  };

  const handleDelete = async () => {
    if (!videoToDelete) return;
    const id = videoToDelete.id;
    setIsDeleting(id);

    try {
      await axios.delete(`${API_URL}/videos/${id}`);
      setVideos(prev => prev.filter(v => v.id !== id));
      addToast("Video deleted successfully", "success");
    } catch (e) {
      addToast("Failed to delete video. Server might be busy.", "error");
      refreshLibrary();
    } finally {
      setIsDeleting(null);
      setVideoToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      
      {/* ============ SEARCH BAR (YouTube Style) ============ */}
      <div className="flex-shrink-0 px-12 py-6 border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full px-5 py-3 pl-14 bg-[#121212] border border-[#303030] rounded-full text-white placeholder-[#888] text-base focus:outline-none focus:border-blue-600 transition-colors"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#888]" size={20} />
          </div>
        </div>
      </div>

      {/* ============ MAIN CONTENT AREA ============ */}
      <div className="flex-1 overflow-y-auto px-12 py-8">
        
        {filteredVideos.length > 0 ? (
          <div className="max-w-[1600px] mx-auto">
            {/* Grid: 3-4 videos per row (like YouTube) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
              {filteredVideos.map((video, idx) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={onPlay}
                  onChat={onChat}
                  onDelete={confirmDelete}
                  isDeleting={isDeleting === video.id}
                  getCleanVideoName={getCleanVideoName}
                  getTimeAgo={getTimeAgo}
                  delay={idx * 0.03}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ============ EMPTY STATE ============ */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-28 h-28 bg-[#181818] rounded-full flex items-center justify-center mb-6 mx-auto">
                {searchQuery ? <Search size={48} className="text-[#606060]" /> : <Film size={48} className="text-[#606060]" />}
              </div>
              <p className="text-xl font-medium text-white mb-2">
                {searchQuery ? 'No results found' : 'No videos yet'}
              </p>
              <p className="text-sm text-[#aaa]">
                {searchQuery ? 'Try different keywords' : 'Upload your first video to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============ DELETE CONFIRMATION DIALOG ============ */}
      <ConfirmDialog
        isOpen={!!videoToDelete}
        onClose={() => setVideoToDelete(null)}
        onConfirm={handleDelete}
        title="Delete video?"
        message={`"${videoToDelete ? getCleanVideoName(videoToDelete) : ''}" will be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

// ============ VIDEO CARD COMPONENT (YouTube Style) ============
const VideoCard = ({ 
  video, 
  onPlay, 
  onChat, 
  onDelete, 
  isDeleting, 
  getCleanVideoName, 
  getTimeAgo,
  delay = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer group"
    >
      {/* ============ THUMBNAIL ============ */}
      <div 
        onClick={() => onPlay(video)}
        className="relative w-full aspect-video bg-[#181818] rounded-xl overflow-hidden mb-3"
      >
        {/* Thumbnail Image */}
        <motion.img
          src={video.thumbnail}
          alt={getCleanVideoName(video)}
          className="w-full h-full object-cover"
          animate={{
            scale: isHovered ? 1.05 : 1
          }}
          transition={{ duration: 0.2 }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />

        {/* Play Button Overlay (on hover) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-2xl">
                <Play size={28} className="text-black ml-1" fill="black" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons (top-right, on hover) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 right-2 flex gap-2 z-10"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChat(video);
                }}
                className="w-9 h-9 bg-black/90 hover:bg-blue-600 backdrop-blur-sm rounded-full flex items-center justify-center transition-all shadow-lg"
                title="Chat with AI"
              >
                <MessageSquare size={17} className="text-white" />
              </button>
              <button
                onClick={(e) => onDelete(video, e)}
                disabled={isDeleting}
                className="w-9 h-9 bg-black/90 hover:bg-red-600 backdrop-blur-sm rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50"
                title="Delete video"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={17} className="text-white" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration Badge (bottom-right) */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/90 backdrop-blur-sm rounded text-xs font-semibold text-white">
          Video
        </div>
      </div>

      {/* ============ VIDEO INFO (Below Thumbnail) ============ */}
      <div className="flex gap-3">
        {/* Channel Avatar */}
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {getCleanVideoName(video).charAt(0).toUpperCase()}
        </div>

        {/* Video Metadata */}
        <div className="flex-1 min-w-0">
          {/* Title (2 lines max) */}
          <h3 className="text-white font-medium text-[15px] leading-[1.4] line-clamp-2 mb-1 group-hover:text-white/90 transition-colors">
            {getCleanVideoName(video)}
          </h3>

          {/* Channel Name */}
          <p className="text-[#aaa] text-[13px] hover:text-white transition-colors cursor-pointer mb-0.5">
            ReelInsight
          </p>

          {/* Time Ago */}
          <p className="text-[#aaa] text-[13px]">
            {getTimeAgo(video)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoLibrary;