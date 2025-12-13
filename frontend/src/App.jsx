import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Play, Loader2, X, Clock, Video, MessageSquare, FileText, Upload, CloudDownload, FileVideo, ChevronDown, Send, Copy, ExternalLink, SkipBack, SkipForward, Pause, Volume2, VolumeX, Rewind, FastForward } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

// --- COMPONENT: Safe Dropdown ---
const VideoSelector = ({ value, onChange, options = [] }) => (
  <div className="relative inline-block w-64">
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-[#0d1117] border border-slate-700 text-slate-300 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
    >
      {options && options.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
      <ChevronDown size={16} />
    </div>
  </div>
);

// -------------------- VLC-Style Video Player --------------------
const VideoPlayer = ({ videoId, timestamp = 0, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(Number(timestamp) || 0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const start = Math.max(0, Number(timestamp) || 0);
    let filename = String(videoId || "");
    if (!filename.endsWith(".mp4")) filename = `${filename}.mp4`;
    
    // STREAMING URL
    const streamUrl = `${API_URL}/stream/${encodeURIComponent(filename)}`;

    const onLoadedMetadata = () => {
      if (Number.isFinite(vid.duration)) setDuration(vid.duration);
      if (Math.abs(vid.currentTime - start) > 0.5) {
        vid.currentTime = start;
      }
      vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    const onTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(vid.currentTime || 0);
      }
      if (!duration && Number.isFinite(vid.duration)) setDuration(vid.duration);
    };
    
    const onEnded = () => setIsPlaying(false);
    
    vid.addEventListener('loadedmetadata', onLoadedMetadata);
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('ended', onEnded);

    vid.src = streamUrl;
    vid.load();

    return () => {
      vid.removeEventListener('loadedmetadata', onLoadedMetadata);
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('ended', onEnded);
    };
  }, [videoId, timestamp]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handler = (e) => {
      if (!videoRef.current) return;
      if (e.key === 'ArrowLeft') seekRelative(-5);
      else if (e.key === 'ArrowRight') seekRelative(5);
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'm') toggleMute();
      else if (e.key === 'Escape') onClose(); // ESC to Close
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else { v.play().then(() => setIsPlaying(true)).catch(e => console.log(e)); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const seekRelative = (delta) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, Math.min(v.duration || 10000, v.currentTime + delta));
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // --- SCRUBBING LOGIC (Smooth) ---
  const handleScrubStart = () => {
    setIsScrubbing(true);
    // Optional: Pause while dragging if you prefer, but VLC keeps playing sound mostly.
    // We will keep it playing for "Live Preview" feel.
  };

  const handleScrubMove = (e) => {
    const t = Number(e.target.value);
    setCurrentTime(t); // Update slider UI instantly
    if (videoRef.current) {
        videoRef.current.currentTime = t; // Update video frame instantly
    }
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    // If it was playing before, ensure it keeps playing
    if (isPlaying && videoRef.current) {
        videoRef.current.play();
    }
  };

  const formatTime = (s) => {
    if (isNaN(s) || !isFinite(s)) return "00:00";
    const sec = Math.floor(s);
    return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm" onClick={onClose}>
      
      {/* Container: Explicit Flex Column Layout */}
      <div 
        className="bg-[#0f111a] w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* 1. Video Area (Takes remaining height, shrinks if needed) */}
        <div className="relative bg-black flex-1 min-h-0 flex justify-center items-center overflow-hidden">
          <video 
            ref={videoRef} 
            className="w-full h-full object-contain" 
            onClick={togglePlay} 
            style={{cursor: 'pointer'}} 
          />
          
          {/* Big Play Overlay (Only when paused) */}
          {!isPlaying && (
            <button onClick={togglePlay} className="absolute bg-black/40 p-6 rounded-full text-white/80 hover:scale-110 transition-transform duration-200 backdrop-blur-sm border border-white/10">
              <Play size={48} fill="currentColor" />
            </button>
          )}

          {/* Top Right Controls (Overlay) */}
          <div className="absolute top-4 right-4 flex gap-2">
             <button onClick={toggleMute} className="bg-black/60 p-2 rounded-full hover:bg-white/20 text-white transition-colors">{isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
          </div>
        </div>

        {/* 2. Control Bar (Fixed Height, Stays Visible) */}
        <div className="bg-[#161b22] p-4 border-t border-slate-800 shrink-0 select-none">
          
          {/* Top Row: Scrubber */}
          <div className="flex items-center gap-3 mb-4 group">
            <span className="text-xs text-slate-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
            
            <div className="relative flex-1 h-6 flex items-center">
               {/* Background Track */}
               <div className="absolute w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-75 ease-out" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
               </div>
               
               {/* Actual Input (Invisible but interactive) */}
               <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.1}
                value={currentTime} 
                onMouseDown={handleScrubStart}
                onTouchStart={handleScrubStart}
                onChange={handleScrubMove}
                onMouseUp={handleScrubEnd}
                onTouchEnd={handleScrubEnd}
                className="absolute w-full h-full opacity-0 cursor-pointer z-20"
              />
              
              {/* Visible Thumb (Moves with state) */}
              <div 
                className="absolute h-4 w-4 bg-white rounded-full shadow-lg pointer-events-none z-10 transition-transform duration-75 ease-out"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: `translateX(-50%)` }}
              ></div>
            </div>

            <span className="text-xs text-slate-400 font-mono w-10">{formatTime(duration)}</span>
          </div>

          {/* Bottom Row: Buttons & Title */}
          <div className="flex items-center justify-between">
            
            {/* Title & Badge */}
            <div className="flex items-center gap-3 overflow-hidden max-w-[40%]">
               <div className="bg-indigo-900/50 text-indigo-200 text-[10px] px-2 py-1 rounded border border-indigo-500/30 uppercase font-bold tracking-wide">Playing</div>
               <h3 className="text-slate-200 font-medium text-sm truncate" title={videoId}>{videoId}</h3>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-4">
               <button onClick={() => seekRelative(-10)} className="text-slate-400 hover:text-white transition-colors" title="-10s">
                 <Rewind size={20} />
               </button>
               
               <button onClick={togglePlay} className="bg-white text-black p-2 rounded-full hover:bg-slate-200 transition-colors shadow-lg shadow-indigo-500/20">
                 {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
               </button>

               <button onClick={() => seekRelative(10)} className="text-slate-400 hover:text-white transition-colors" title="+10s">
                 <FastForward size={20} />
               </button>
            </div>

            {/* Navigation & Close */}
            <div className="flex items-center gap-2 max-w-[40%] justify-end">
               <button onClick={onPrev} disabled={!hasPrev} className="p-2 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"><SkipBack size={20}/></button>
               <button onClick={onNext} disabled={!hasNext} className="p-2 text-slate-500 hover:text-white disabled:opacity-30 transition-colors"><SkipForward size={20}/></button>
               
               <div className="w-px h-6 bg-slate-700 mx-2"></div>
               
               <button onClick={onClose} className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg transition-all duration-200 border border-red-900/30">
                 <X size={16} /> <span className="text-xs font-bold">CLOSE</span>
               </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------

function App() {
  const [activeTab, setActiveTab] = useState("search"); 
  const [videoList, setVideoList] = useState(["All Videos"]); 

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState("All Videos");

  const [activeVideo, setActiveVideo] = useState(null);
  const [resultIndex, setResultIndex] = useState(0); 

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [ingestStatus, setIngestStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState(null);
  const [isChatting, setIsChatting] = useState(false);
  const [chatFilter, setChatFilter] = useState("All Videos");

  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState(""); 

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API_URL}/videos`);
      if (res.data.videos) {
        setVideoList(["All Videos", ...res.data.videos]);
        if (res.data.videos.length > 0 && !summaryFilter) setSummaryFilter(res.data.videos[0]);
      }
    } catch (e) { console.error("Fetch error", e); }
  };

  const getContextSnippet = (c) => {
    if (!c) return "";
    try {
      if (typeof c === 'string') return c.replace('Said:', '').trim();
      return String(c).replace('Said:', '').trim();
    } catch (e) { return ""; }
  };

  const handleSearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      const filter = searchFilter === "All Videos" ? null : searchFilter;
      const res = await axios.get(`${API_URL}/search`, { params: { query, k: 12, filter: filter } });
      setResults(res.data.results || []);
    } catch (err) { alert("Search Failed"); }
    setIsSearching(false);
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      monitorProgress(res.data.filename);
    } catch (err) { alert("Upload Failed"); setIsUploading(false); }
  };

  const handleUrlProcess = async () => {
    if (!uploadUrl) return;
    setIsUploading(true);
    try {
      const res = await axios.post(`${API_URL}/process_url`, { url: uploadUrl });
      monitorProgress(res.data.filename);
    } catch (err) { alert("URL Failed"); setIsUploading(false); }
  };

  const monitorProgress = (filename) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/progress/${filename}`);
        const { percent, status } = res.data;
        setIngestStatus({ percent, status });
        if (percent >= 100 || percent === -1) {
          clearInterval(interval);
          setIsUploading(false);
          fetchVideos(); 
          if (percent === 100) alert("Processing Complete!");
        }
      } catch (e) { clearInterval(interval); }
    }, 1000);
  };

  const handleChat = async () => {
    if (!chatQuery) return;
    setIsChatting(true);
    try {
      const filter = chatFilter === "All Videos" ? null : chatFilter;
      const res = await axios.get(`${API_URL}/ask_ai`, { params: { query: chatQuery, video_filter: filter } });
      setChatResponse(res.data);
    } catch (e) { alert("Chat Error"); }
    setIsChatting(false);
  };

  const handleSummary = async () => {
    if (!summaryFilter || summaryFilter === "All Videos") {
      alert("Please select a specific video."); return;
    }
    setIsSummarizing(true);
    try {
      const res = await axios.get(`${API_URL}/summarize`, { params: { video_id: summaryFilter } });
      setSummary(res.data.summary);
    } catch (e) { alert("Summary Error"); }
    setIsSummarizing(false);
  };

  const getImageUrl = (path) => {
    if (!path) return undefined;
    const parts = path.replace(/\\/g, "/").split("/data/");
    return parts.length > 1 ? `${API_URL}/data/${parts[1]}` : undefined;
  };

  const handleResultNavigation = (delta) => {
    const newIdx = resultIndex + delta;
    if (newIdx >= 0 && newIdx < results.length) {
      openVideoAtResult(results[newIdx], newIdx);
    }
  };

  const openVideoAtResult = (r, idx = 0) => {
    const vidId = r.video_id || r.videoId || r.video || r.filename || r.name;
    let ts = Number(r.timestamp || r.ts || 0);
    if (ts > 36000) ts = ts / 1000;

    setActiveVideo({ video_id: vidId, timestamp: ts });
    setResultIndex(idx);
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      
      {/* NAVBAR */}
      <div className="bg-[#161b22] border-b border-slate-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Video className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">ReelInsight</h1>
          </div>
          <div className="flex bg-[#0d1117] rounded-lg p-1 border border-slate-800">
            {[{ id: 'upload', icon: Upload, label: 'Upload' }, { id: 'search', icon: Search, label: 'Search' }, { id: 'chat', icon: MessageSquare, label: 'Chat' }, { id: 'summary', icon: FileText, label: 'Summary' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* 1. UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#161b22] p-8 rounded-2xl border border-slate-800 group">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 text-indigo-400"><FileVideo size={24}/></div>
                <h3 className="text-xl font-bold text-white mb-2">Upload File</h3>
                <input type="file" accept=".mp4" onChange={(e) => setUploadFile(e.target.files[0])} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-600 file:text-white mb-4"/>
                <button onClick={handleFileUpload} disabled={isUploading || !uploadFile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium disabled:opacity-50">{isUploading ? "Uploading..." : "Start Processing"}</button>
              </div>
              <div className="bg-[#161b22] p-8 rounded-2xl border border-slate-800 group">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 text-red-400"><CloudDownload size={24}/></div>
                <h3 className="text-xl font-bold text-white mb-2">YouTube URL</h3>
                <input type="text" placeholder="https://youtube.com..." value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white focus:border-indigo-500 outline-none"/>
                <button onClick={handleUrlProcess} disabled={isUploading || !uploadUrl} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">{isUploading ? "Processing..." : "Fetch & Process"}</button>
              </div>
            </div>
            {ingestStatus && (
              <div className="mt-8 bg-[#161b22] p-6 rounded-xl border border-slate-800 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between mb-2"><span className="text-sm font-medium text-white">{ingestStatus.status}</span><span className="text-sm font-mono text-indigo-400">{ingestStatus.percent}%</span></div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${ingestStatus.percent}%` }} /></div>
              </div>
            )}
          </div>
        )}

        {/* 2. SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="animate-in fade-in duration-300">
             <div className="flex flex-col items-center gap-6 mb-12">
               <VideoSelector value={searchFilter} onChange={setSearchFilter} options={videoList} />
               <div className="relative w-full max-w-3xl flex items-center bg-[#161b22] rounded-full border border-slate-700 shadow-2xl p-1">
                  <input type="text" className="w-full bg-transparent border-none py-3 px-6 text-lg focus:outline-none text-white placeholder-slate-500" placeholder="Search for 'winning goal'..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                  <button onClick={handleSearch} disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-full font-medium flex items-center gap-2 transition-colors">{isSearching ? <Loader2 className="animate-spin" size={20} /> : "Search"}</button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.map((r, idx) => (
                <div key={idx} className="group bg-[#161b22] rounded-xl border border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all hover:-translate-y-1" onClick={() => openVideoAtResult(r, idx)}>
                  <div className="relative aspect-video bg-black">
                    <img src={getImageUrl(r.frame_path)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
                    <div className="absolute top-2 left-2"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${r.type && r.type.includes('Visual') ? 'bg-purple-900/90 text-purple-100' : 'bg-emerald-900/90 text-emerald-100'}`}>{r.type}</span></div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono flex items-center gap-1"><Clock size={12}/> {Math.floor(r.timestamp || 0)}s</div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20"><div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white shadow-lg"><Play size={24} fill="currentColor" /></div></div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">"{getContextSnippet(r.context)}"</p>
                    <div className="mt-3 flex items-center gap-3">
                       <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width: `${(r.score || 0)*100}%`}}></div></div>
                       <span className="text-[10px] font-mono text-slate-500">{(((r.score || 0)*100) || 0).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. CHAT TAB */}
        {activeTab === 'chat' && (
           <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-[#161b22] rounded-2xl border border-slate-800 p-8 shadow-2xl">
               <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20"><MessageSquare className="text-indigo-400" size={32} /></div>
                 <h2 className="text-2xl font-bold text-white">Ask the Video</h2>
                 <div className="mt-4 flex justify-center"><VideoSelector value={chatFilter} onChange={setChatFilter} options={videoList} /></div>
               </div>
               <div className="flex gap-3 mb-8">
                 <input type="text" className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600" placeholder="e.g. What color was the car?" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} />
                 <button onClick={handleChat} disabled={isChatting} className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl text-white transition-colors">{isChatting ? <Loader2 className="animate-spin" /> : <Send size={24} />}</button>
               </div>
               {chatResponse && (
                 <div className="bg-[#0d1117] rounded-xl p-6 border border-slate-800 animate-in fade-in">
                   <h3 className="text-indigo-400 font-semibold mb-2 text-sm uppercase tracking-wide">AI Answer</h3>
                   <p className="text-slate-200 leading-relaxed text-lg">{chatResponse.answer}</p>
                   <div className="mt-6 pt-4 border-t border-slate-800">
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Evidence Sources</h4>
                     <div className="flex flex-wrap gap-2">
                       {(Array.isArray(chatResponse.context) ? chatResponse.context : [chatResponse.context]).map((c, i) => (
                         <button key={i} className="text-xs bg-[#161b22] border border-slate-700 px-3 py-1.5 rounded-lg text-slate-400 hover:border-indigo-500 hover:text-white transition-colors flex items-center gap-2" onClick={() => openVideoAtResult(c, -1)}><Play size={10} /> {Math.floor(c.timestamp || c.ts || c.time || 0)}s</button>
                       ))}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
        )}

        {/* 4. SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-[#161b22] rounded-2xl border border-slate-800 p-8">
               <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-800">
                 <div>
                    <h2 className="text-2xl font-bold text-white">Video Summary</h2>
                    <p className="text-slate-400 text-sm mt-1 mb-2">Select a video to generate a detailed report.</p>
                    <VideoSelector value={summaryFilter} onChange={setSummaryFilter} options={videoList?.filter(v => v !== "All Videos")} />
                 </div>
                 <button onClick={handleSummary} disabled={isSummarizing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors">{isSummarizing ? <Loader2 className="animate-spin" size={18}/> : "Generate Report"}</button>
               </div>
               {summary ? (
                 <div className="prose prose-invert max-w-none"><div className="bg-[#0d1117] p-8 rounded-xl border border-slate-800 leading-loose whitespace-pre-wrap text-slate-300">{summary}</div></div>
               ) : (
                 <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl opacity-50"><FileText className="mx-auto text-slate-600 mb-4" size={48} /><p className="text-slate-500">Select a video above to begin.</p></div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* GLOBAL VIDEO MODAL */}
      {activeVideo && (
        <VideoPlayer 
          key={`${activeVideo.video_id}-${activeVideo.timestamp}`} 
          videoId={activeVideo.video_id} 
          timestamp={activeVideo.timestamp} 
          onClose={() => setActiveVideo(null)} 
          onNext={() => handleResultNavigation(1)}
          onPrev={() => handleResultNavigation(-1)}
          hasNext={resultIndex < results.length - 1}
          hasPrev={resultIndex > 0}
        />
      )}
    </div>
  );
}

export default App;