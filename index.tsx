
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- GLOBAL FETCH INTERCEPTOR (SAFE PATCH) ---
(function applyInterceptor() {
    const originalFetch = window.fetch;
    if (!originalFetch) return;

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = '';

        if (typeof input === 'string') {
            url = input;
        } else if (input instanceof URL) {
            url = input.toString();
        } else if (input instanceof Request) {
            url = input.url;
        }

        // Only intercept calls to our internal API
        const isApiCall = url.startsWith('/api') || url.includes('/api/');
        
        if (isApiCall) {
            const token = localStorage.getItem('superair_token') || sessionStorage.getItem('superair_token');
            
            if (token) {
                // If it is NOT a Request object, we safely inject headers via the init object
                if (!(input instanceof Request)) {
                    init = init || {};
                    const headers = new Headers(init.headers || {});
                    
                    if (!headers.has('Authorization')) {
                        headers.set('Authorization', `Bearer ${token}`);
                    }
                    init.headers = headers;
                } else {
                    // For instances where input is a Request object
                    try {
                        if (!input.headers.has('Authorization')) {
                            input.headers.set('Authorization', `Bearer ${token}`);
                        }
                    } catch (e) {
                        // Request headers might be immutable in some environments
                    }
                }
            }
        }

        // Forwarding original input to preserve all Request features
        const response = await originalFetch(input, init);

        // Global 401/403 Handling: If session is dead, clean up (unless we are already at login)
        if ((response.status === 401 || response.status === 403) && !url.includes('/api/auth/login')) {
            if (!window.location.hash.includes('/login')) {
                console.warn("🔐 Session expired or invalid. Token removed.");
                localStorage.removeItem('superair_token');
                localStorage.removeItem('superair_user');
            }
        }

        return response;
    };

    try {
        // Attempt simple reassignment first
        window.fetch = wrappedFetch;
    } catch (e) {
        // If fetch is a getter-only property, Object.defineProperty is required to redefine it
        try {
            Object.defineProperty(window, 'fetch', {
                value: wrappedFetch,
                configurable: true,
                writable: true,
                enumerable: true
            });
        } catch (defineError) {
            console.error("Fetch interceptor could not be applied due to environment restrictions.", defineError);
        }
    }
})();

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
