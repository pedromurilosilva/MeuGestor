const CACHE_NAME = 'gestor-v1.0.2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/chart.js'
  ];

self.addEventListener('install', (e) => {
    e.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
        );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
          caches.keys().then(keys => Promise.all(
                  keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
                ))
        );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (url.pathname.includes('app.js') || url.pathname.includes('index.html')) {
          e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
          return;
    }
    e.respondWith(
          caches.match(e.request).then((res) => {
                  return res || fetch(e.request);
          })
        );
});
