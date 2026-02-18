// App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from './config';

// --- COMPONENTS ---
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import VideoLibrary from './components/VideoLibrary';
import VideoPlayer from './components/VideoPlayer';
import UploadSection from './components/UploadSection';
import SearchSection from './components/SearchSection';
import ChatSection from './components/ChatSection';
import SummarySection from './components/SummarySection';

function App() {
  const [activeTab, setActiveTab] = useState("library");
  const [videoList, setVideoList] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);

  // ============================================
  // PERSISTENT STATE - CHAT
  // ============================================
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hello! Ask me anything about your video library." }
  ]);
  const [chatFilter, setChatFilter] = useState("All Videos");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ============================================
  // PERSISTENT STATE - SUMMARY
  // ============================================
  const [summaryText, setSummaryText] = useState("");
  const [summaryVideo, setSummaryVideo] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // ============================================
  // PERSISTENT STATE - SEARCH
  // ============================================
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchFilter, setSearchFilter] = useState("All Videos");

  // ============================================
  // PERSISTENT STATE - UPLOAD
  // ============================================
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  // ============================================
  // RESET FUNCTIONS
  // ============================================
  const resetChat = () => {
    setChatMessages([{ role: 'assistant', text: "Hello! Ask me anything about your video library." }]);
    setChatFilter("All Videos");
    setIsChatLoading(false);
  };

  const resetSummary = () => {
    setSummaryText("");
    setSummaryVideo(videoList[0]?.id || "");
    setIsSummaryLoading(false);
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFilter("All Videos");
  };

  const resetUpload = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setUploadedFile(null);
    setIsProcessing(false);
    setProcessingStatus("");
  };

  // ============================================
  // LOGIC MOVED FROM CHILDREN (THE BRAINS)
  // ============================================

  // 1. Chat Logic
  const handleChatSend = async (inputText) => {
    if (!inputText.trim()) return;

    const userMsg = { role: 'user', text: inputText };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const selectedFilter = chatFilter === "All Videos" ? null : chatFilter;
      const res = await axios.get(`${API_URL}/ask_ai`, {
        params: { query: userMsg.text, video_filter: selectedFilter }
      });

      const aiMsg = {
        role: 'assistant',
        text: res.data.answer,
        sources: res.data.context
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I encountered an error analyzing the video." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 2. Summary Logic
  const handleGenerateSummary = async () => {
    if (!summaryVideo || summaryVideo === "All Videos") return;

    setIsSummaryLoading(true);
    setSummaryText("");

    try {
      const res = await axios.get(`${API_URL}/summarize`, { params: { video_id: summaryVideo } });
      setSummaryText(res.data.summary);
    } catch (e) {
      setSummaryText("Failed to generate summary. Please try again.");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // ============================================
  // FETCH VIDEOS ON MOUNT
  // ============================================
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API_URL}/videos`);
      const cleanList = (res.data.videos || []).filter(v => typeof v !== 'string');
      setVideoList(cleanList);

      // Set initial summary video if not set
      if (!summaryVideo && cleanList.length > 0) {
        setSummaryVideo(cleanList[0].id);
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handlePlay = (videoOrResult) => {
    const id = videoOrResult.video_id || videoOrResult.id || videoOrResult;
    const ts = videoOrResult.timestamp || videoOrResult.ts || 0;
    setActiveVideo({ videoId: id, timestamp: ts });
  };

  const handleChatJump = (videoId) => {
    setChatFilter(videoId);
    setActiveTab("chat");
  };

  const handleUploadComplete = () => {
    fetchVideos();
    setActiveTab("library");
  };

  // ============================================
  // PAGE TITLE LOGIC
  // ============================================
  const getPageTitle = () => {
    switch(activeTab) {
      case 'library': return 'Video Library';
      case 'upload': return 'Upload Content';
      case 'search': return 'Search Moments';
      case 'chat': return 'AI Assistant';
      case 'summary': return 'Video Summaries';
      default: return 'Dashboard';
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-black overflow-hidden">
        
        {/* SIDEBAR */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col h-screen bg-black overflow-hidden">
          
          {/* HEADER */}
          <Header 
            title={getPageTitle()} 
            onUploadClick={() => setActiveTab('upload')} 
          />

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-hidden bg-black">
            {activeTab === 'library' && (
              <VideoLibrary
                videos={videoList}
                setVideos={setVideoList}
                onPlay={handlePlay}
                onChat={handleChatJump}
                refreshLibrary={fetchVideos}
              />
            )}

            {activeTab === 'upload' && (
              <UploadSection
                onUploadComplete={handleUploadComplete}
                uploadProgress={uploadProgress}
                setUploadProgress={setUploadProgress}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                processingStatus={processingStatus}
                setProcessingStatus={setProcessingStatus}
                onReset={resetUpload}
              />
            )}

            {activeTab === 'search' && (
              <SearchSection
                videoList={videoList}
                onPlayResult={handlePlay}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                searchFilter={searchFilter}
                setSearchFilter={setSearchFilter}
              />
            )}

            {activeTab === 'chat' && (
              <ChatSection
                videoList={videoList}
                onPlaySource={handlePlay}
                messages={chatMessages}
                filter={chatFilter}
                setFilter={setChatFilter}
                onSend={handleChatSend}
                isLoading={isChatLoading}
              />
            )}

            {activeTab === 'summary' && (
              <SummarySection
                videoList={videoList}
                summary={summaryText}
                selectedVideo={summaryVideo}
                setSelectedVideo={setSummaryVideo}
                onGenerate={handleGenerateSummary}
                isLoading={isSummaryLoading}
              />
            )}
          </div>
        </div>

        {/* GLOBAL VIDEO PLAYER MODAL */}
        {activeVideo && (
          <VideoPlayer
            videoId={activeVideo.videoId}
            timestamp={activeVideo.timestamp}
            onClose={() => setActiveVideo(null)}
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;