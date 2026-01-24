import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- GLOBAL FETCH INTERCEPTOR (ROBUST VERSION) ---
(function applyInterceptor() {
    const originalFetch = window.fetch;
    if (!originalFetch) return;

    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = '';
        if (typeof input === 'string') url = input;
        else if (input instanceof URL) url = input.toString();
        else if (input instanceof Request) url = input.url;

        const isApiCall = url.includes('/api/');
        const isLoginPath = url.includes('/api/auth/login');
        
        if (isApiCall) {
            const token = localStorage.getItem('superair_token');
            if (token && !isLoginPath) {
                if (!(input instanceof Request)) {
                    init = init || {};
                    const headers = new Headers(init.headers || {});
                    if (!headers.has('Authorization')) {
                        headers.set('Authorization', `Bearer ${token}`);
                    }
                    init.headers = headers;
                }
            }
        }

        try {
            const response = await originalFetch(input, init);

            // Solo redirigir si el error es de autorización y NO es la ruta de login
            if ((response.status === 401 || response.status === 403) && !isLoginPath) {
                const currentToken = localStorage.getItem('superair_token');
                // Si teníamos un token y falló, es que expiró o es inválido (ej. cambio de secret en server)
                if (currentToken) {
                    console.warn("🔐 Sesión inválida o expirada. Limpiando credenciales...");
                    localStorage.removeItem('superair_token');
                    localStorage.removeItem('superair_user');
                    
                    if (!window.location.hash.includes('/login')) {
                        // Usamos replaceState + Event para evitar el error de setter en Location.hash
                        window.history.replaceState(null, '', '#/login');
                        window.dispatchEvent(new Event('hashchange'));
                    }
                }
            }

            if (response.status >= 500) {
                window.dispatchEvent(new CustomEvent('superair_server_error', { 
                    detail: { message: "Error de servidor. Reintenta en unos segundos." } 
                }));
            }

            return response;
        } catch (error) {
            window.dispatchEvent(new CustomEvent('superair_network_error', { 
                detail: { message: "Sin conexión con el servidor." } 
            }));
            throw error;
        }
    };

    try {
        window.fetch = wrappedFetch;
    } catch (e) {
        Object.defineProperty(window, 'fetch', { value: wrappedFetch, configurable: true, writable: true });
    }
})();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}