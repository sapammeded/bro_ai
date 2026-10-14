const CACHE_NAME = "bro-ai-v061-static";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./handoff.js"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(res => {
    if (res.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req).then(cached => cached || caches.match("./index.html"))));
});
