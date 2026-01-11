import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- GLOBAL FETCH INTERCEPTOR (SECURITY PATCH) ---
const originalFetch = window.fetch;

// Use Object.defineProperty to override window.fetch safely
// This bypasses the "setting getter-only property" error in strict environments
try {
    Object.defineProperty(window, 'fetch', {
        value: async (input: RequestInfo | URL, init?: RequestInit) => {
            // Determine URL string to check for /api prefix
            let urlString = '';
            if (typeof input === 'string') {
                urlString = input;
            } else if (input instanceof URL) {
                urlString = input.toString();
            } else if (input instanceof Request) {
                urlString = input.url;
            }

            // Only intercept calls to our own API (relative paths starting with /api)
            if (urlString.startsWith('/api') || urlString.includes(window.location.origin + '/api')) {
                let authHeader: Record<string, string> = {};
                
                // Try to get token from storage
                try {
                    const token = localStorage.getItem('superair_token') || sessionStorage.getItem('superair_token');
                    if (token) {
                        authHeader = { 'Authorization': `Bearer ${token}` };
                    }
                } catch (e) {
                    // Ignore storage errors
                }

                const newConfig: RequestInit = {
                    ...init,
                    headers: {
                        ...authHeader,
                        ...(init?.headers || {})
                    }
                };
                
                const response = await originalFetch(input, newConfig);
                
                // Global 401/403 Handling
                if (response.status === 401 || response.status === 403) {
                    // Avoid redirects if already on login or public pages
                    if (!window.location.hash.includes('/login')) {
                        // Optional: trigger logout
                    }
                }
                
                return response;
            }
            
            return originalFetch(input, init);
        },
        writable: true,
        configurable: true
    });
} catch (e) {
    console.error("Failed to install fetch interceptor:", e);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.debug('SW registration failed: ', registrationError);
      });
  });
}