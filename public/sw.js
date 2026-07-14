/* Cache everything on install, then serve from cache first.
   Result: after one visit, Piano Quest opens with no internet at all. */
const CACHE = "piano-quest-v1";
const ASSETS = [
  "./", "./index.html", "./app.js", "./fonts.css",
  "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.concat(["./fonts/2245892f8e.woff2", "./fonts/42078d9d05.woff2", "./fonts/5a947a7f77.woff2", "./fonts/619281128c.woff2", "./fonts/9ad6ba4387.woff2", "./fonts/9bb7177fb8.woff2", "./fonts/b219a4db47.woff2", "./fonts/d0fd4b2ad9.woff2"])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // stash anything new (e.g. the font files) for next time
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
