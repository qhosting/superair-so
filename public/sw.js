
const CACHE_NAME = 'superair-erp-v5'; // Versión actualizada para forzar refresco
const DYNAMIC_CACHE = 'superair-assets-v5'; 

// App Shell: Archivos mínimos para que la app arranque
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// INSTALACIÓN
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forzar activación inmediata para que el usuario vea los cambios
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [SW] Pre-caching App Shell v5');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ACTIVACIÓN (Limpieza de cachés viejos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ [SW] Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Tomar control de las pestañas abiertas inmediatamente
});

// INTERCEPTOR DE PETICIONES
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. ESTRATEGIA API: Network Only (Siempre datos frescos del servidor)
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // 2. ESTRATEGIA NAVEGACIÓN (HTML): Network First, Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. ESTRATEGIA ASSETS (JS, CSS, Imágenes): Stale-While-Revalidate
  if (event.request.destination === 'script' || 
      event.request.destination === 'style' || 
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
           // Fallback silencioso si no hay red
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});
