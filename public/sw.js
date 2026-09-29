/**
 * Minimal app-shell service worker.
 * Network-first for same-origin GETs, cache fallback when offline.
 * Does not cache IndexedDB / workout data — those stay in the IDB wrapper.
 */
const CACHE_NAME = "protocol-shell-v2";

const PRECACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/icons/icon-p-simple.svg",
  "/icons/icon-p-simple-192.png",
  "/icons/icon-p-simple-512.png",
  "/icons/icon-p-192-maskable.png",
  "/icons/icon-p-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[protocol/sw] precache missed", url, err);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return false;
  if (url.pathname.includes("hot-update")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
