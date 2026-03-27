// components/ChatSection.jsx
import { useState } from 'react';
import { MessageSquare, Send, Bot, User, Play, Loader2, Sparkles, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import VideoSelector from './ui/VideoSelector';

const ChatSection = ({ 
  videoList, 
  onPlaySource,
  messages,
  filter,
  setFilter,
  onSend,
  isLoading 
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const selectedVideoData = videoList.find(v => v.id === filter);

  return (
    <div className="flex gap-6 h-full">
      
      {/* LEFT PANEL: VIDEO SELECTOR & CONTROLS - 40% */}
      <div className="w-[40%] flex flex-col gap-6">
        
        {/* Main Card with Video Selector + Preview */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl">
          
          {/* Section Header */}
          <div className="p-6 border-b border-slate-700/50 relative z-50">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Focus Video</h3>
            </div>
            <p className="text-xs text-slate-500">Chat about a specific video or all videos</p>
          </div>

          {/* Video Selector - with z-index fix */}
          <div className="p-6 border-b border-slate-700/50 relative z-30">
            <VideoSelector
              videos={videoList}
              selected={filter}
              onChange={setFilter}
              mode="compact"
              allowAll={true}
            />
          </div>

          {/* Video Preview Thumbnail - Show only when specific video selected */}
          {selectedVideoData && filter !== "All Videos" && (
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
          {filter === "All Videos" && (
            <div className="p-6">
              <div className="rounded-xl bg-slate-900/30 border-2 border-dashed border-slate-700/50 aspect-video flex flex-col items-center justify-center text-slate-500">
                <Sparkles size={40} className="mb-3 text-indigo-500/50" />
                <p className="text-sm font-medium">Chatting about all videos</p>
                <p className="text-xs text-slate-600 mt-1">AI will search across your entire library</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-6 shadow-xl relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-300">AI Assistant</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Ask questions about video content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Get timestamped references</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Click sources to jump to moments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Powered by Ollama & CLIP</span>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL: CHAT INTERFACE - 60% */}
      <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Chat</h3>
              <p className="text-xs text-slate-500">
                {filter === "All Videos" 
                  ? `Searching across ${videoList.length} videos` 
                  : `Focused on: ${filter?.substring(0, 20)}...`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              
              <div className={`flex flex-col max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Sources - Only for assistant messages */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 space-y-1 w-full">
                    <p className="text-xs text-slate-500 font-medium px-2">Sources:</p>
                    {msg.sources.slice(0, 3).map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => onPlaySource(src)}
                        className="w-full text-left px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 rounded-lg text-xs text-slate-400 hover:text-indigo-400 transition-all flex items-center gap-2 group"
                      >
                        <Play size={12} className="shrink-0 text-indigo-500 group-hover:text-indigo-400" />
                        <span className="truncate flex-1">
                          {src.video_id?.substring(0, 15)}... @ {Math.floor(src.timestamp)}s
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center shrink-0">
                  <User size={16} className="text-slate-400" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-2xl flex items-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={16} />
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-700/50 bg-slate-900/30">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your videos..."
              className="flex-1 bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;