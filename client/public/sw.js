const CACHE_NAME = "exam-seat-allotment-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./vite.svg",
  "./icon-192.jpg",
  "./icon-512.jpg"
];

// Install Event - Pre-cache essential shell files
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale cache versions
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network-first with cache-fallback strategy
self.addEventListener("fetch", (e) => {
  // Only handle http and https schemes (skip chrome-extension, etc.)
  if (!e.request.url.startsWith("http://") && !e.request.url.startsWith("https://")) {
    return;
  }

  // Skip non-GET and API endpoints
  if (e.request.method !== "GET" || e.request.url.includes("/students") || e.request.url.includes("/rooms") || e.request.url.includes("/allotments") || e.request.url.includes("/auth")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (!res || res.status !== 200 || res.type !== "basic") {
          return res;
        }
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, clone);
        });
        return res;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
