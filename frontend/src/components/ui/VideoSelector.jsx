// components/ui/VideoSelector.jsx
import { useState, useRef, useEffect } from 'react';
import { Search, Check, Video, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoSelector = ({ 
  videos = [], 
  selected = "All Videos", 
  onChange, 
  mode = "compact", // "sidebar" or "compact"
  allowAll = true,
  placeholder = "Search videos..."
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const focusedItemRef = useRef(null);

  // Filter videos based on search
  const filteredVideos = videos.filter(v => 
    (v.title || v.id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build full list with "All Videos" if allowed
  const fullList = allowAll ? ["All Videos", ...filteredVideos] : filteredVideos;

  // Close dropdown when clicking outside (compact mode only)
  useEffect(() => {
    if (mode !== "compact") return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, mode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || mode !== "compact") return;

    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < fullList.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < fullList.length) {
            const item = fullList[focusedIndex];
            const videoId = item === "All Videos" ? "All Videos" : item.id;
            handleSelect(videoId);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, fullList, mode]);

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [focusedIndex]);

  // Reset focused index when opening dropdown
  useEffect(() => {
    if (isOpen) {
      // Find current selected index
      const selectedIndex = fullList.findIndex(item => {
        if (item === "All Videos") return selected === "All Videos";
        return item.id === selected;
      });
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen]);

  // Get display name for selected video
  const getSelectedName = () => {
    if (selected === "All Videos") return `All Videos (${videos.length})`;
    const video = videos.find(v => v.id === selected);
    return video?.title || video?.id || "Select video";
  };

  // Handle selection
  const handleSelect = (videoId) => {
    onChange(videoId);
    if (mode === "compact") {
      setIsOpen(false);
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  };

  // SIDEBAR MODE (for Chat page - left panel)
  if (mode === "sidebar") {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-3 border-b border-slate-700/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 font-medium mb-2">Select video to focus chat</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {allowAll && (
            <button
              onClick={() => handleSelect("All Videos")}
              className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                selected === "All Videos"
                  ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                  : 'hover:bg-slate-700/30 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selected === "All Videos" ? 'bg-indigo-600/30' : 'bg-slate-700/50'
                }`}>
                  <Video size={16} className={selected === "All Videos" ? 'text-indigo-400' : 'text-slate-500'} />
                </div>
                <span className={`text-sm font-medium ${
                  selected === "All Videos" ? 'text-indigo-300' : 'text-slate-400'
                }`}>
                  All Videos ({videos.length})
                </span>
              </div>
              {selected === "All Videos" && <Check size={16} className="text-indigo-400" />}
            </button>
          )}

          {filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleSelect(video.id)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                  selected === video.id
                    ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                    : 'hover:bg-slate-700/30 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={video.thumbnail} 
                    alt=""
                    className="w-12 h-8 rounded object-cover shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span className={`text-sm truncate ${
                    selected === video.id ? 'text-indigo-300 font-medium' : 'text-slate-400'
                  }`}>
                    {video.title || video.id}
                  </span>
                </div>
                {selected === video.id && <Check size={16} className="text-indigo-400 shrink-0" />}
              </button>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">
              No videos found
            </div>
          )}
        </div>
      </div>
    );
  }

  // COMPACT MODE (for Summary page - dropdown)
  return (
    <div className="relative" ref={containerRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left flex items-center justify-between hover:bg-slate-800 hover:border-slate-600 transition-all group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Video size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
          <span className="text-sm text-slate-300 truncate">{getSelectedName()}</span>
        </div>
        <ChevronDown 
          size={18} 
          className={`text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-[9999]"
          >
            {/* Search Box */}
            <div className="p-3 border-b border-slate-700/50 bg-slate-900/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>
            </div>

            {/* List with max 5 items visible + scroll */}
            <div ref={listRef} className="max-h-[260px] overflow-y-auto">
              {allowAll && (
                <button
                  ref={focusedIndex === 0 ? focusedItemRef : null}
                  onClick={() => handleSelect("All Videos")}
                  onMouseEnter={() => setFocusedIndex(0)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                    selected === "All Videos"
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : focusedIndex === 0
                      ? 'bg-slate-700/70 text-slate-300'
                      : 'hover:bg-slate-700/50 text-slate-400'
                  } ${focusedIndex === 0 ? 'ring-2 ring-indigo-500/50 ring-inset' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Video size={16} />
                    <span className="text-sm font-medium">All Videos ({videos.length})</span>
                  </div>
                  {selected === "All Videos" && <Check size={16} className="text-indigo-400" />}
                </button>
              )}

              {filteredVideos.length > 0 ? (
                filteredVideos.map((video, idx) => {
                  const listIndex = allowAll ? idx + 1 : idx;
                  const isSelected = selected === video.id;
                  const isFocused = focusedIndex === listIndex;
                  
                  return (
                    <button
                      key={video.id}
                      ref={isFocused ? focusedItemRef : null}
                      onClick={() => handleSelect(video.id)}
                      onMouseEnter={() => setFocusedIndex(listIndex)}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300'
                          : isFocused
                          ? 'bg-slate-700/70 text-slate-300'
                          : 'hover:bg-slate-700/50 text-slate-400'
                      } ${isFocused ? 'ring-2 ring-indigo-500/50 ring-inset' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img 
                          src={video.thumbnail} 
                          alt=""
                          className="w-12 h-8 rounded object-cover shrink-0"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className="text-sm truncate">{video.title || video.id}</span>
                      </div>
                      {isSelected && <Check size={16} className="text-indigo-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-slate-600 text-sm">
                  No videos found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoSelector;