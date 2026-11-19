const CACHE_NAME = "gpsc-recorder-v2";
const APP_URL = "/gpsc-guidance-recorder.html";
const ASSETS = [
  APP_URL,
  "/gpsc-guidance-recorder.webmanifest",
  "/gpsc-recorder-icon.svg"
];
const THIRD_PARTY_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
];

async function cacheResponse(request, response) {
  if (!response || (!response.ok && response.type !== "opaque")) return response;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (error) {
    // A cache quota or opaque-response restriction must not block the page.
  }
  return response;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async asset => {
      try { await cache.add(asset); } catch (error) { /* Network may be temporarily unavailable. */ }
    }));
    await Promise.all(THIRD_PARTY_ASSETS.map(async asset => {
      try {
        const request = new Request(asset, { mode: "no-cors", cache: "reload" });
        const response = await fetch(request);
        await cacheResponse(asset, response);
      } catch (error) {
        // PDF rendering will require a connection until these library files are cached.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("gpsc-recorder-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (THIRD_PARTY_ASSETS.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request) || await cache.match(url.href);
      const network = fetch(request).then(response => cacheResponse(request, response)).catch(() => null);
      return cached || await network || Response.error();
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          if (url.pathname === APP_URL) await cache.put(APP_URL, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request) || await cache.match(APP_URL) || Response.error();
      }
    })());
    return;
  }

  if (ASSETS.includes(url.pathname) ||
      ["script", "style", "image", "font", "worker"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then(response => cacheResponse(request, response)).catch(() => null);
      return cached || await network || Response.error();
    })());
  }
});
