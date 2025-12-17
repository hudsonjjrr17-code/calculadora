const CACHE_NAME = 'supermarket-calculadora-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx', // Cache the main script for offline functionality
  'https://cdn-icons-png.flaticon.com/512/3737/3737151.png' // Cache the main icon
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});

self.addEventListener('fetch', (event) => {
  // Use a stale-while-revalidate strategy for all GET requests.
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // If the request is successful, update the cache.
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            // Fetch failed, probably offline. The cached response (if exists) is already served.
            console.warn(`Fetch failed for: ${event.request.url}`, err);
          });

          // Return the cached response immediately if available, otherwise wait for the network.
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});