const CACHE_NAME = 'cuberun-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: Pre-caching offline assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // External APIs or trackers (like gamedistribution) should bypass cache
    if (event.request.url.includes('gamedistribution') || event.request.url.includes('google')) {
        event.respondWith(fetch(event.request).catch(() => new Response('{}', { status: 200 }))); // Fail gracefully
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Stale-While-Revalidate Strategy
            const fetchPromise = fetch(event.request).then(networkResponse => {
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => {
                console.log('SW: Network failed, relying on cache');
            });
            return cachedResponse || fetchPromise;
        })
    );
});
