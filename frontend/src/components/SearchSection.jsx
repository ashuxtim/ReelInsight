// components/SearchSection.jsx
import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Play, Clock, Sparkles, Video, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoSelector from './ui/VideoSelector';
import { API_URL } from '../config';

const SearchSection = ({ 
  videoList, 
  onPlayResult,
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  setSearchResults,
  searchFilter, 
  setSearchFilter 
}) => {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const selectedFilter = searchFilter === "All Videos" ? null : searchFilter;
      const res = await axios.get(`${API_URL}/search`, { 
        params: { query: searchQuery, k: 12, filter: selectedFilter } 
      });
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getImageUrl = (path) => {
    return path;
  };

  const selectedVideoData = videoList.find(v => v.id === searchFilter);

  return (
    <div className="flex gap-6 h-full">
      
      {/* LEFT PANEL: VIDEO SELECTOR & CONTROLS - 40% */}
      <div className="w-[40%] flex flex-col gap-6">
        
        {/* Main Card with Video Selector + Preview */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl">
          
          {/* Section Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Search Scope</h3>
            </div>
            <p className="text-xs text-slate-500">Search in a specific video or all videos</p>
          </div>

          {/* Video Selector - with z-index fix */}
          <div className="p-6 border-b border-slate-700/50 relative z-50">
            <VideoSelector
              videos={videoList}
              selected={searchFilter}
              onChange={setSearchFilter}
              mode="compact"
              allowAll={true}
            />
          </div>

          {/* Video Preview Thumbnail - Show only when specific video selected */}
          {selectedVideoData && searchFilter !== "All Videos" && (
            <div className="p-6">
              <div className="relative rounded-xl overflow-hidden bg-slate-900/50 aspect-video flex items-center justify-center group">
                <img 
                  src={selectedVideoData.thumbnail} 
                  alt={selectedVideoData.id}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                  <Video size={48} />
                  <p className="mt-2 text-sm">No preview available</p>
                </div>
                {/* Overlay with video info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                  <div className="p-4 w-full">
                    <p className="text-xs text-slate-400 mb-1">Video ID</p>
                    <p className="text-sm text-white font-medium truncate">
                      {selectedVideoData.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Videos State */}
          {searchFilter === "All Videos" && (
            <div className="p-6">
              <div className="rounded-xl bg-slate-900/30 border-2 border-dashed border-slate-700/50 aspect-video flex flex-col items-center justify-center text-slate-500">
                <Sparkles size={40} className="mb-3 text-cyan-500/50" />
                <p className="text-sm font-medium">Searching all videos</p>
                <p className="text-xs text-slate-600 mt-1">AI will search across {videoList.length} videos</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl border border-cyan-500/20 p-6 shadow-xl relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-300">Search Features</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Natural language queries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Visual & speech matching</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Timestamp precision</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Click to jump to moment</span>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL: SEARCH INTERFACE & RESULTS - 60% */}
      <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Search Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Search size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Moment Search</h3>
              <p className="text-xs text-slate-500">Find specific moments using natural language</p>
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Try: "person wearing red shirt" or "sunset scene"'
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                disabled={isSearching}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          {/* Results Count */}
          {searchResults.length > 0 && !isSearching && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Target size={14} className="text-cyan-400" />
              <span>Found {searchResults.length} matching moments</span>
            </div>
          )}
        </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center"
                  >
                    <div className="relative w-20 h-20 mb-6">
                      <svg className="animate-spin w-full h-full text-cyan-600/20" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75 text-cyan-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <p className="text-slate-400 font-medium animate-pulse">Searching moments...</p>
                  </motion.div>
                ) : searchResults.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    {searchResults.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => onPlayResult(result)}
                        className="group relative bg-slate-900/30 border border-slate-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all"
                      >
                        <div className="aspect-video bg-slate-900/50 relative overflow-hidden">
                          <img
                            src={getImageUrl(result.frame_path)}
                            alt="Match"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 flex-col items-center justify-center bg-slate-900/50 text-slate-600">
                            <Video size={32} />
                          </div>
                          
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                              <Play size={20} className="text-white ml-1" />
                            </div>
                          </div>

                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-slate-900/90 backdrop-blur-sm text-xs font-medium rounded-lg border border-slate-700/50 text-slate-300">
                              {result.type}
                            </span>
                          </div>

                          <div className="absolute bottom-2 right-2">
                            <div className="px-2 py-1 bg-slate-900/90 backdrop-blur-sm rounded-lg flex items-center gap-1 text-xs text-slate-300 border border-slate-700/50">
                              <Clock size={12} />
                              <span>{Math.floor(result.timestamp)}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3">
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {result.context ? result.context.replace('Said:', '').trim() : 'Visual Match'}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 truncate">
                            {result.video_id}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : searchQuery ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-slate-600"
                  >
                    <div className="w-20 h-20 bg-slate-700/20 rounded-2xl flex items-center justify-center mb-6">
                      <Search size={40} />
                    </div>
                    <p className="text-lg font-medium text-slate-500">No matches found</p>
                    <p className="text-sm text-slate-600 mt-2">Try different keywords or select a different video filter</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-slate-600"
                  >
                    <div className="w-20 h-20 bg-slate-700/20 rounded-2xl flex items-center justify-center mb-6">
                      <Search size={40} />
                    </div>
                    <p className="text-lg font-medium text-slate-500">Start searching your video library</p>
                    <p className="text-sm text-slate-600 mt-2">Try: "person wearing red shirt" or "sunset scene"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      );
    };

export default SearchSection;