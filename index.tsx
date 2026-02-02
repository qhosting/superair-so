
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- GLOBAL FETCH INTERCEPTOR (FIXED FOR GETTER-ONLY ENVIRONMENTS) ---
(function applyInterceptor() {
    const originalFetch = window.fetch.bind(window);
    
    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = '';
        if (typeof input === 'string') url = input;
        else if (input instanceof URL) url = input.toString();
        else if (input instanceof Request) url = input.url;

        const isApiCall = url.includes('/api/');
        const isLoginPath = url.includes('/api/auth/login');
        
        if (isApiCall && !isLoginPath) {
            const token = localStorage.getItem('superair_token');
            if (token) {
                init = init || {};
                const headers: Record<string, string> = {};
                
                if (init.headers) {
                    if (init.headers instanceof Headers) {
                        init.headers.forEach((value, key) => { headers[key] = value; });
                    } else if (Array.isArray(init.headers)) {
                        init.headers.forEach(([key, value]) => { headers[key] = value; });
                    } else {
                        Object.assign(headers, init.headers);
                    }
                }

                if (!headers['Authorization'] && !headers['authorization']) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                init.headers = headers;
            }
        }

        try {
            const response = await originalFetch(input, init);

            if ((response.status === 401 || response.status === 403) && !isLoginPath) {
                const currentToken = localStorage.getItem('superair_token');
                if (currentToken) {
                    console.warn(`🔐 Acceso denegado (${response.status}) para: ${url}. Verificando sesión...`);
                    
                    if (response.status === 401) {
                        localStorage.removeItem('superair_token');
                        localStorage.removeItem('superair_user');
                        window.history.replaceState(null, '', '#/login');
                        window.dispatchEvent(new Event('hashchange'));
                    }
                }
            }

            return response;
        } catch (error) {
            window.dispatchEvent(new CustomEvent('superair_network_error', { 
                detail: { message: "Error de comunicación con el servidor ERP." } 
            }));
            throw error;
        }
    };

    try {
        // Usamos defineProperty para evitar el error de "getter-only property" en ciertos navegadores/entornos
        Object.defineProperty(window, 'fetch', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: interceptedFetch
        });
    } catch (e) {
        // Fallback extremo si el objeto window está muy protegido
        console.error("No se pudo interceptar fetch mediante defineProperty, intentando asignación directa.");
        try {
            window.fetch = interceptedFetch;
        } catch (err) {
            console.error("Falla crítica al inyectar interceptor de seguridad.");
        }
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
