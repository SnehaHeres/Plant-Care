// constants.js

// Import API key from .env
export const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- FIX: Model updated from gemini-1.5-flash to gemini-3-pro ---
// Base API URL
export const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;
