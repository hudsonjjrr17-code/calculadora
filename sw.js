const CACHE_NAME = 'supercalc-v2-offline';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Domains that should be cached dynamically (CDNs)
const CACHE_DOMAINS = [
  'esm.sh',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn-icons-png.flaticon.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Check if request is for one of our external domains or local files
  const isExternalAsset = CACHE_DOMAINS.some(domain => url.hostname.includes(domain));
  const isLocalAsset = url.origin === self.location.origin;

  if (isLocalAsset || isExternalAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Clone the request because it's a stream and can only be consumed once
          const fetchRequest = event.request.clone();

          return fetch(fetchRequest).then(
            (response) => {
              // Check if we received a valid response
              if(!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            }
          ).catch(() => {
            // Fallback for navigation requests (HTML)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
        })
    );
  }
});