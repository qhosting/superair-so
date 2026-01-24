
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- GLOBAL FETCH INTERCEPTOR (ENHANCED MONITORING) ---
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

        const isApiCall = url.startsWith('/api') || url.includes('/api/');
        
        if (isApiCall) {
            const token = localStorage.getItem('superair_token') || sessionStorage.getItem('superair_token');
            
            if (token) {
                if (!(input instanceof Request)) {
                    init = init || {};
                    const headers = new Headers(init.headers || {});
                    if (!headers.has('Authorization')) {
                        headers.set('Authorization', `Bearer ${token}`);
                    }
                    init.headers = headers;
                } else {
                    try {
                        if (!input.headers.has('Authorization')) {
                            input.headers.set('Authorization', `Bearer ${token}`);
                        }
                    } catch (e) { }
                }
            }
        }

        try {
            const response = await originalFetch(input, init);

            // Manejo de errores de autenticación
            if ((response.status === 401 || response.status === 403) && !url.includes('/api/auth/login')) {
                const currentHash = window.location.hash;
                if (!currentHash.includes('/login')) {
                    localStorage.removeItem('superair_token');
                    localStorage.removeItem('superair_user');
                    window.location.hash = '#/login';
                }
            }

            // Detección de errores de servidor (Posible caída de DB)
            if (response.status >= 500) {
                console.error("🚨 [SERVER ERROR 500] Error crítico en el backend.");
                window.dispatchEvent(new CustomEvent('superair_server_error', { 
                    detail: { message: "El servidor encontró un error (DB). Reintenta en unos segundos." } 
                }));
            }

            return response;
        } catch (error) {
            console.error("🌐 [NETWORK ERROR] No se pudo contactar al servidor:", error);
            window.dispatchEvent(new CustomEvent('superair_network_error', { 
                detail: { message: "Sin conexión con el servidor. Verifica tu internet." } 
            }));
            throw error;
        }
    };

    try {
        window.fetch = wrappedFetch;
    } catch (e) {
        try {
            Object.defineProperty(window, 'fetch', {
                value: wrappedFetch,
                configurable: true,
                writable: true,
                enumerable: true
            });
        } catch (defineError) { }
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
        console.log('SW registered');
      })
      .catch(registrationError => {
        console.debug('SW registration failed');
      });
  });
}
