// ================================
// service-worker.js
// Offline support via Cache API
// ================================

const CACHE_NAME = "puzzleflow-v1";

// Core assets to pre-cache on install
const PRE_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
];

// ── Install: pre-cache shell assets ───────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

// ── Activate: remove stale caches ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ───────────────────────────────
// Strategy:
//   1. Try network first (always fresh for API calls)
//   2. On failure (offline), serve from cache
//   3. Cache successful GET responses for future offline use
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept same-origin GET requests (not API calls or cross-origin)
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache a clone of the successful response
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        // Network failed — serve from cache
        caches.match(request).then(
          (cached) =>
            cached ||
            // Ultimate fallback: return the cached index.html for SPA routing
            caches.match("./index.html")
        )
      )
  );
});
