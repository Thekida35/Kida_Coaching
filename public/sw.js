/* Kida — service worker : ouverture instantanée (cache de l'app) et notifications du brief. */
const VERSION = "kida-v6";
const STATIC = /^\/(icons\/|apple-touch-icon|manifest\.webmanifest)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // L'app : affichée depuis le cache tout de suite, mise à jour en arrière-plan pour la prochaine ouverture.
  if (req.mode === "navigate" && url.origin === location.origin && url.pathname === "/") {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const cached = await c.match("/");
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok && !res.redirected) c.put("/", res.clone());
            return res;
          })
          .catch(() => cached);
        if (cached) {
          e.waitUntil(fresh);
          return cached;
        }
        return fresh;
      }),
    );
    return;
  }

  // Icônes, manifeste et polices : cache d'abord (ils ne changent qu'avec un nouveau ?v=).
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (isFont || (url.origin === location.origin && STATIC.test(url.pathname))) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      }),
    );
  }
  // Tout le reste (API) passe directement par le réseau.
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "Kida", { body: d.body || "", icon: "/icons/icon-192.png?v=2", badge: "/icons/icon-192.png?v=2", data: { url: d.url || "/" } }),
    // l'app ouverte rafraîchit le point rouge de la cloche
    self.clients.matchAll({ type: "window" }).then((cs) => cs.forEach((c) => c.postMessage({ type: "push" }))),
  ]));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
