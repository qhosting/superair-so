
const CACHE_NAME = 'superair-erp-v4'; // Version Bumped to fix Menu Cache
const DYNAMIC_CACHE = 'superair-assets-v4'; // Version Bumped

// App Shell: Archivos mínimos para que la app arranque
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// INSTALACIÓN
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forzar activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [SW] Pre-caching App Shell');
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
  self.clients.claim();
});

// INTERCEPTOR DE PETICIONES
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. ESTRATEGIA API: Network Only
  // Nunca guardar respuestas de la API en caché para evitar datos viejos de clientes/ventas
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // 2. ESTRATEGIA NAVEGACIÓN (HTML): Network First, Fallback to Cache
  // Intenta ir a la red para obtener la versión más nueva de la app.
  // Si no hay internet, devuelve el index.html guardado.
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
  // Sirve rápido desde caché, pero actualiza en segundo plano.
  // Esto permite guardar todos los archivos generados por Vite dinámicamente.
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
           // Si falla red y no hay caché, no hacer nada
        });

        // Devolver caché si existe, si no, esperar a la red
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});