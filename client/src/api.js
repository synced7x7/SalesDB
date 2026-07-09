import axios from 'axios';

// Check if we are running locally or in production (Vercel)
const API_BASE_URL = import.meta.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5001';

const api = axios.create({
    baseURL: API_BASE_URL
});

export default api;