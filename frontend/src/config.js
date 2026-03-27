// src/config.js

// API Configuration
// Uses environment variable if available, falls back to localhost
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Future configs can go here:
// export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
// export const SUPPORTED_FORMATS = ['mp4', 'avi', 'mov', 'mkv'];
