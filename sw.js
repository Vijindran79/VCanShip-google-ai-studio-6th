// sw.js

const CACHE_NAME = 'vcanship-cache-v2'; // Version bumped
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  '/manifest.json',
  '/LocaleSwitcher.css',
  '/locales.json',
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients.
  );
});


self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from the network.
    event.respondWith(fetch(event.request));
    return;
  }

  // For HTML navigation requests, use a network-first strategy.
  // This ensures the user gets the latest page, but can still load offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails, serve the main index.html from cache.
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For other assets (CSS, JS, images), use a cache-first strategy for speed.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If the resource is in the cache, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's not in the cache, fetch it from the network.
      return fetch(event.request).then((networkResponse) => {
        // Clone the response, cache it, and return it.
        // We clone it because a response is a stream and can only be consumed once.
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});