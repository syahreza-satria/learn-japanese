/* Service worker Manabii: precache seluruh situs statis agar bisa dipakai offline.
   Daftar berkas dibuat saat build oleh scripts/postbuild-sw.mjs (sw-manifest.json). */
const SCOPE = self.registration.scope; // mis. https://host/learn-japanese/
const PREFIX = "manabii-";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(new URL("sw-manifest.json", SCOPE), { cache: "no-store" });
      const { version, files } = await res.json();
      const cache = await caches.open(`${PREFIX}${version}`);
      await cache.addAll(files.map((f) => new URL(f, SCOPE).href));
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(new URL("sw-manifest.json", SCOPE), { cache: "no-store" }).catch(() => null);
      const current = res ? `${PREFIX}${(await res.json()).version}` : null;
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== current) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function fromCache(request, options) {
  for (const key of await caches.keys()) {
    if (!key.startsWith(PREFIX)) continue;
    const hit = await (await caches.open(key)).match(request, options);
    if (hit) return hit;
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Font & CSS pihak ketiga: stale-while-revalidate. TTS online & lainnya: biarkan ke jaringan.
  if (url.origin !== self.location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(`${PREFIX}runtime`);
          const cached = await cache.match(request);
          const network = fetch(request)
            .then((res) => {
              cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })(),
      );
    }
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await fromCache(request, { ignoreSearch: true });
      if (request.mode === "navigate") {
        // Halaman: jaringan dulu (konten terbaru), cadangan dari cache saat offline.
        try {
          return await fetch(request);
        } catch {
          return (
            cached ||
            (await fromCache(new URL("404.html", SCOPE).href)) ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }
      }
      return cached || fetch(request);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = clients.find((c) => c.url.startsWith(SCOPE));
      if (open) return open.focus();
      return self.clients.openWindow(new URL("flashcard?deck=due", SCOPE).href);
    })(),
  );
});
