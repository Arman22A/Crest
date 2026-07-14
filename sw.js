const cacheName = "crest-v28";
const vapidPublicKey = "BA1j44cNJV6QoirknYZOiFPQaLiygwxyVmRbaFCcIm3V5lFmTeM-S1SgctoZXNNR5makhB7ip44OcXjDXNMeRQc";
const assets = [
  "./",
  "./index.html",
  "./styles.css?v=28",
  "./script.js?v=28",
  "./manifest.webmanifest?v=28",
  "./icon.ico?v=28",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png?v=28",
  "./knight-hall-desktop.webp",
  "./knight-hall-mobile.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(assets))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Crest";
  const incompleteCount = Number(payload.incompleteCount) || 0;
  const options = {
    body: payload.body || "Открой Crest и проверь задачи на сегодня.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: payload.tag || "crest-reminder",
    renotify: true,
    data: {
      url: payload.url || "./index.html"
    }
  };

  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    if (incompleteCount > 0 && self.navigator && "setAppBadge" in self.navigator) {
      await self.navigator.setAppBadge(incompleteCount).catch(() => {});
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./index.html", self.location.href).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const current = windows.find((client) => new URL(client.url).origin === new URL(targetUrl).origin);
    if (current) {
      const navigated = "navigate" in current ? await current.navigate(targetUrl) : current;
      return navigated.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  );
});

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
