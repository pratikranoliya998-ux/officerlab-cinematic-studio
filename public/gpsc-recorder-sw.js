const CACHE_NAME = "gpsc-recorder-v7";
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
// Serve byte-range requests from a previously cached same-origin media response.
// Recordings in IndexedDB are exposed as blob: URLs and are handled natively by
// the browser; those blob URLs do not pass through this service worker.
async function cachedMediaRangeResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(new Request(request.url, { method: "GET" }));
  if (!cached || cached.type === "opaque") {
    try { return await fetch(request); }
    catch (error) {
      return new Response("This media file is not available offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }

  const blob = await cached.blob();
  const size = blob.size;
  const rangeHeader = request.headers.get("range") || "";
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  const unsatisfied = () => new Response(null, {
    status: 416,
    statusText: "Range Not Satisfiable",
    headers: { "Content-Range": "bytes */" + size, "Accept-Ranges": "bytes" }
  });
  if (!match || (!match[1] && !match[2]) || size <= 0) return unsatisfied();

  let start, end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return unsatisfied();
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || start >= size || end < start) return unsatisfied();
  end = Math.min(end, size - 1);

  const part = blob.slice(start, end + 1, cached.headers.get("Content-Type") || "application/octet-stream");
  const headers = new Headers(cached.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
  headers.set("Content-Length", String(part.size));
  headers.delete("Content-Encoding");
  headers.delete("Transfer-Encoding");
  return new Response(part, { status: 206, statusText: "Partial Content", headers });
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

  const isMedia = ["audio", "video"].includes(request.destination) ||
    /\.(mp4|m4v|webm|mp3|m4a|aac|ogg|wav)$/i.test(url.pathname);
  if (isMedia && request.headers.has("range")) {
    event.respondWith(cachedMediaRangeResponse(request));
    return;
  }

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
