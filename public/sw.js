const CACHE_NAME = 'officerlab-shell-v2';
const BUILD_ASSETS = [];
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './officerlab-icon.svg',
  './officerlab-icon-192.svg',
  './officerlab-icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...APP_SHELL, ...BUILD_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('officerlab-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;
        const appShell = await caches.match(new URL('./index.html', self.registration.scope).href);
        return appShell || new Response('OfficerLab is offline. Open it once while connected to the internet, then try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  const isStaticAsset = ['script', 'style', 'image', 'font', 'worker'].includes(request.destination);
  if (!isStaticAsset) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      event.waitUntil(fetch(request).then(response => {
        if (response && response.ok) return caches.open(CACHE_NAME).then(cache => cache.put(request, response));
      }).catch(() => {}));
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response('This OfficerLab resource is not available offline yet.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});