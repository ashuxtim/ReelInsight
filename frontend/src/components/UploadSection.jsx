// components/UploadSection.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileVideo, Youtube, CheckCircle, AlertCircle, Clock, Zap, XCircle, Sparkles } from 'lucide-react';
import { useToast } from './ui/Toast';
import { API_URL } from '../config';

const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const UploadSection = ({ 
  onUploadComplete,
  uploadProgress, 
  setUploadProgress, 
  isUploading, 
  setIsUploading, 
  uploadedFile, 
  setUploadedFile, 
  isProcessing, 
  setIsProcessing, 
  processingStatus, 
  setProcessingStatus,
  onReset 
}) => {
  const [activeTab, setActiveTab] = useState('file');
  const [url, setUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // ✨ NEW: Track the current filename to allow cancellation
  const [currentFilename, setCurrentFilename] = useState(null);
  
  const intervalRef = useRef(null);
  const currentStatus = processingStatus || "idle";
  const { addToast } = useToast();

  useEffect(() => {
    if (currentStatus === 'success') {
      const timer = setTimeout(() => {
        onUploadComplete();
        onReset();
        setUrl("");
        setCurrentFilename(null); // Reset local state
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus, onUploadComplete, onReset]);

  const validateFile = (file) => {
    const validTypes = ['video/mp4'];
    const isMp4 = validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.mp4');
    
    if (!isMp4) {
      return `Invalid format. Please upload an MP4 video (H.264 recommended).`;
    }
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    
    return null;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setUploadedFile(null);
        setErrorMsg(validationError);
        addToast(validationError, "error");
        e.target.value = "";
      } else {
        setUploadedFile(selectedFile);
        setErrorMsg("");
      }
    }
  };

  const startUpload = async () => {
    if (activeTab === 'file' && !uploadedFile) return;
    if (activeTab === 'url' && !url) return;

    setProcessingStatus("uploading");
    setIsUploading(true);
    setUploadProgress(10);
    setErrorMsg("");

    try {
      let filename;
      if (activeTab === 'file') {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        const res = await axios.post(`${API_URL}/upload`, formData);
        filename = res.data.filename;
      } else {
        const res = await axios.post(`${API_URL}/process_url`, { url });
        filename = res.data.filename;
      }

      // ✨ NEW: Save filename so we can cancel it later if needed
      setCurrentFilename(filename);

      setProcessingStatus("processing");
      setIsProcessing(true);
      addToast("Upload successful. Starting AI processing...", "info");
      monitorProgress(filename);
    } catch (err) {
      console.error(err);
      setProcessingStatus("error");
      setIsUploading(false);
      setIsProcessing(false);
      const msg = err.response?.data?.detail || "Upload failed. Check server connection.";
      setErrorMsg(msg);
      addToast(msg, "error");
    }
  };

  // ✨ NEW: Handle Cancellation
  const handleCancel = async () => {
    if (!currentFilename) return;
    
    // Stop the UI progress polling immediately
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setProcessingStatus("error");
    addToast("Cancelling process...", "info");

    try {
      // Call backend to stop worker and delete partial files
      await axios.post(`${API_URL}/cancel/${currentFilename}`);
      addToast("Processing cancelled and cleaned up.", "success");
    } catch (err) {
      console.error("Cancel failed", err);
      // Even if API fails, we reset UI to let user try again
    } finally {
      onReset();
      setUploadedFile(null);
      setUrl("");
      setCurrentFilename(null);
      setUploadProgress(0);
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Keep track of failures outside the interval
  const errorCountRef = useRef(0); 

  const monitorProgress = (filename) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    errorCountRef.current = 0; // Reset errors

    intervalRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/progress/${filename}`);
        const { percent, status } = res.data;

        // Successful call? Reset error count.
        errorCountRef.current = 0; 

        setUploadProgress(Math.max(30, percent));

        if (status === "Cancelled by User") {
            handleCancel();
            return;
        }

        if (percent >= 100) {
          clearInterval(intervalRef.current);
          setProcessingStatus("success");
          setIsUploading(false);
          setIsProcessing(false);
          addToast("Video processed successfully!", "success");
        }
      } catch (e) {
        console.warn("Progress poll failed", e);
        errorCountRef.current += 1;

        // Only fail if we hit 5 errors in a row (approx 5 seconds of downtime)
        if (errorCountRef.current > 5) {
            clearInterval(intervalRef.current);
            setProcessingStatus("error");
            setIsUploading(false);
            setIsProcessing(false);
            addToast("Lost connection to server.", "error");
        }
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex gap-6 h-full">
      
      {/* LEFT PANEL: UPLOAD CONTROLS - 40% */}
      <div className="w-[40%] flex flex-col justify-between gap-6">
        
        {/* Main Upload Card */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-visible flex-1 flex flex-col">
          
          {/* Section Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Upload Method</h3>
            </div>
            <p className="text-xs text-slate-500">Choose file upload or YouTube URL</p>
          </div>

          {/* Tab Selector */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('file')}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'file'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <FileVideo size={18} />
                <span>File Upload</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'url'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <Youtube size={18} />
                <span>YouTube URL</span>
              </button>
            </div>
          </div>

          {/* Upload Area - File Tab */}
          {activeTab === 'file' && (
            <div className="p-6 flex-1 flex flex-col">
              <label className="flex-1 border-2 border-dashed border-slate-600/50 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept="video/mp4"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading || isProcessing}
                />
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all ${
                    uploadedFile ? 'bg-emerald-600/20' : errorMsg ? 'bg-red-600/20' : 'bg-slate-700/50 group-hover:bg-blue-600/20'
                  }`}>
                    {uploadedFile ? (
                      <CheckCircle className="text-emerald-400" size={32} />
                    ) : errorMsg ? (
                      <XCircle className="text-red-400" size={32} />
                    ) : (
                      <Upload className="text-slate-400 group-hover:text-blue-400 transition-colors" size={32} />
                    )}
                  </div>
                  <p className={`text-sm font-medium mb-1 ${
                    uploadedFile ? 'text-emerald-400' : errorMsg ? 'text-red-400' : 'text-slate-300'
                  }`}>
                    {uploadedFile ? uploadedFile.name : errorMsg ? "Invalid File" : "Drop your video here"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {errorMsg || "or click to browse"}
                  </p>
                  {!uploadedFile && !errorMsg && (
                    <div className="mt-3 text-[10px] text-slate-600">
                      MP4 format • Max {MAX_FILE_SIZE_MB}MB • H.264 codec
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Upload Area - URL Tab */}
          {activeTab === 'url' && (
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
                    <Youtube className="text-red-400" size={32} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    disabled={isUploading || isProcessing}
                  />
                </div>
                <p className="text-[10px] text-slate-600 text-center">
                  Videos will be downloaded in 720p quality
                </p>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="p-6 border-t border-slate-700/50">
            {isUploading || isProcessing ? (
              // ✨ NEW: CANCEL BUTTON (Shows when processing)
              <button
                onClick={handleCancel}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/10 hover:shadow-red-500/20"
              >
                <XCircle size={20} />
                <span>Cancel Processing</span>
              </button>
            ) : (
              // ORIGINAL START BUTTON (Shows when idle)
              <button
                onClick={startUpload}
                disabled={(activeTab === 'file' && !uploadedFile) || (activeTab === 'url' && !url)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40"
              >
                <Sparkles size={20} />
                <span>Start Processing</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-300">Processing Pipeline</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>Frame extraction & scene detection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>Audio transcription (Whisper AI)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>Visual embedding (CLIP model)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>Vector indexing for search</span>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL: PROGRESS STATUS - 60% */}
      <div className="flex-1 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Status Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              currentStatus === 'success' ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-emerald-500/20' :
              currentStatus === 'error' ? 'bg-gradient-to-br from-red-600 to-red-500 shadow-red-500/20' :
              currentStatus === 'uploading' || currentStatus === 'processing' ? 'bg-gradient-to-br from-blue-600 to-blue-500 shadow-blue-500/20' :
              'bg-slate-700/50'
            }`}>
              {currentStatus === 'success' ? <CheckCircle size={20} className="text-white" /> :
               currentStatus === 'error' ? <XCircle size={20} className="text-white" /> :
               currentStatus === 'uploading' || currentStatus === 'processing' ? <Clock size={20} className="text-white animate-spin" /> :
               <Upload size={20} className="text-slate-500" />}
            </div>
            <div>
              <h3 className="text-white font-semibold">
                {currentStatus === 'success' ? 'Processing Complete!' :
                 currentStatus === 'error' ? 'Processing Failed' :
                 currentStatus === 'uploading' ? 'Uploading...' :
                 currentStatus === 'processing' ? 'AI Processing' :
                 'Ready to Upload'}
              </h3>
              <p className="text-xs text-slate-500">
                {currentStatus === 'uploading' ? 'Transferring media to cloud' :
                 currentStatus === 'processing' ? 'Extracting & analyzing content' :
                 currentStatus === 'success' ? 'Video ready in your library' :
                 currentStatus === 'error' ? 'An error occurred during processing' :
                 'Upload a video to begin'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Content */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          {currentStatus === 'idle' ? (
            <div className="text-center text-slate-600">
              <div className="w-24 h-24 bg-slate-700/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Upload size={48} />
              </div>
              <p className="text-lg font-medium text-slate-500">Ready to process</p>
              <p className="text-sm text-slate-600 mt-2">Select a file or enter a YouTube URL to begin</p>
            </div>
          ) : (currentStatus === 'uploading' || currentStatus === 'processing') ? (
            <div className="w-full max-w-md">
              <div className="relative w-32 h-32 mb-8 mx-auto">
                <svg className="animate-spin w-full h-full text-blue-600/20" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75 text-blue-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-center text-slate-400 text-sm">
                {currentStatus === 'uploading' ? 'Uploading to cloud storage...' : 'AI is analyzing your video...'}
              </p>
            </div>
          ) : currentStatus === 'success' ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-600/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <CheckCircle size={48} className="text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-emerald-400">Complete!</p>
              <p className="text-sm text-slate-500 mt-2">Redirecting to library...</p>
            </div>
          ) : currentStatus === 'error' ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-red-600/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <XCircle size={48} className="text-red-400" />
              </div>
              <p className="text-lg font-medium text-red-400">Failed</p>
              <p className="text-sm text-slate-500 mt-2">{errorMsg || 'An error occurred'}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default UploadSection;