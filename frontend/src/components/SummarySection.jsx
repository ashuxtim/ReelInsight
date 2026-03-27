// components/SummarySection.jsx
import { FileText, Loader2, Play, Sparkles, CheckCircle } from 'lucide-react';
import VideoSelector from './ui/VideoSelector';
import { API_URL } from '../config';

const SummarySection = ({ 
  videoList,
  summary,
  selectedVideo,
  setSelectedVideo,
  onGenerate,
  isLoading
}) => {
  
  const selectedVideoData = videoList.find(v => v.id === selectedVideo);

  return (
    <div className="flex gap-6 h-full">
      
      {/* LEFT PANEL: VIDEO SELECTOR & CONTROLS - 40% */}
<div className="w-[40%] flex flex-col justify-between gap-6">
  
  {/* Main Card with Video Selector + Preview + Generate Button */}
<div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl flex-1 flex flex-col">    
    {/* Section Header - COMPACT */}
    <div className="p-4 border-b border-slate-700/50">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-purple-400" />
        <h3 className="text-base font-semibold text-white">Select Video</h3>
      </div>
    </div>

    {/* Video Selector - with z-index fix */}
    <div className="p-4 border-b border-slate-700/50 relative z-50">
      <VideoSelector
        videos={videoList}
        selected={selectedVideo}
        onChange={setSelectedVideo}
        mode="compact"
        allowAll={false}
      />
    </div>

    {/* Video Preview Thumbnail - FULL SIZE */}
{selectedVideoData && (
  <div className="p-6 border-b border-slate-700/50 flex-1 flex items-center">
    <div className="relative rounded-xl overflow-hidden bg-slate-900/50 aspect-video w-full flex items-center justify-center">
      <img 
        src={selectedVideoData.thumbnail} 
        alt={selectedVideoData.id}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-600">
        <FileText size={48} />
        <p className="mt-2 text-sm">No preview available</p>
      </div>
      {/* Overlay with video info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <p className="text-xs text-slate-400">
          ID: {selectedVideoData.id?.substring(0, 12) || 'Unknown'}...
        </p>
      </div>
    </div>
  </div>
)}


    {/* Generate Button Section - COMPACT */}
    <div className="p-4">
      <button 
        onClick={onGenerate}
        disabled={isLoading || !selectedVideo || selectedVideo === "All Videos"}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={18}/>
            <span className="text-sm">Generating...</span>
          </>
        ) : (
          <>
            <Sparkles size={18}/>
            <span className="text-sm">Generate Summary</span>
          </>
        )}
      </button>

      {selectedVideo === "All Videos" && (
        <p className="mt-2 text-xs text-amber-400/80 text-center">
          Please select a specific video
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          AI will analyze the video transcript and visual content.
        </p>
      </div>
    </div>
  </div>

  {/* Info Card - Summary Features - COMPACT 2-COLUMN */}
  <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-xl relative z-10">
    <h3 className="text-xs font-semibold text-slate-300 mb-3">Summary Features</h3>
    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
      <div className="flex items-start gap-1.5">
        <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>Key points</span>
      </div>
      <div className="flex items-start gap-1.5">
        <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>Topics</span>
      </div>
      <div className="flex items-start gap-1.5">
        <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>Action items</span>
      </div>
      <div className="flex items-start gap-1.5">
        <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>Context-aware</span>
      </div>
    </div>
  </div>
</div>


      {/* RIGHT PANEL: SUMMARY OUTPUT - 60% */}
      <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Output Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Generated Summary</h3>
              <p className="text-xs text-slate-500">AI-powered content analysis</p>
            </div>
          </div>
          
          {summary && !isLoading && (
            <button 
              onClick={() => navigator.clipboard.writeText(summary)}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
            >
              Copy
            </button>
          )}
        </div>

        {/* Output Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-6">
                <svg className="animate-spin w-full h-full text-emerald-600/20" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75 text-emerald-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-slate-400 font-medium animate-pulse">Analyzing video content...</p>
              <p className="text-slate-600 text-sm mt-2">This may take a moment</p>
            </div>
          ) : summary ? (
            <article className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-emerald-400 prose-headings:font-semibold prose-p:text-slate-300 prose-strong:text-white">
              <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">{summary}</div>
            </article>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
              <div className="w-20 h-20 bg-slate-700/20 rounded-2xl flex items-center justify-center mb-6">
                <FileText size={40} />
              </div>
              <p className="text-lg font-medium text-slate-500">No summary yet</p>
              <p className="text-sm text-slate-600 mt-2">Select a video and click Generate to create a summary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
