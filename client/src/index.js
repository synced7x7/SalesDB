import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// 1. Detect if the app is on Vercel or running locally
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001').replace(/\/+$/, '');

// 2. Set the global base URL for ALL axios requests
axios.defaults.baseURL = API_BASE_URL;

// 3. Ensure relative fetch('/api/...') calls use the same backend base URL.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    return nativeFetch(`${API_BASE_URL}${input}`, init);
  }

  if (input instanceof Request) {
    const currentOrigin = window.location.origin;
    if (input.url.startsWith(`${currentOrigin}/api/`)) {
      const url = new URL(input.url);
      const proxiedRequest = new Request(`${API_BASE_URL}${url.pathname}${url.search}`, input);
      return nativeFetch(proxiedRequest, init);
    }
  }

  return nativeFetch(input, init);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
