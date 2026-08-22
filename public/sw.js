/* SamaanX service worker — Web Push only (no fetch interception). */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

function parsePushPayload(event) {
  if (!event.data) {
    return { title: "SamaanX", body: "You have a new notification.", url: "/" };
  }
  try {
    const data = event.data.json();
    const url =
      typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
    return {
      title: typeof data.title === "string" ? data.title : "SamaanX",
      body: typeof data.body === "string" ? data.body : "",
      url,
      icon: typeof data.icon === "string" ? data.icon : "/icons/icon-192.png",
      badge: typeof data.badge === "string" ? data.badge : "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : url,
      notificationId:
        typeof data.notificationId === "string" ? data.notificationId : undefined,
      type: typeof data.type === "string" ? data.type : undefined,
    };
  } catch {
    return {
      title: "SamaanX",
      body: event.data.text() || "You have a new notification.",
      url: "/",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "samaanx-fallback",
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: {
        url: payload.url,
        notificationId: payload.notificationId,
        type: payload.type,
      },
      renotify: true,
    }),
  );
});

async function focusOrOpen(url) {
  const absolute = new URL(url, self.location.origin).href;
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    if (!("focus" in client)) continue;
    const clientUrl = new URL(client.url);
    if (clientUrl.origin !== self.location.origin) continue;
    await client.focus();
    if ("navigate" in client && typeof client.navigate === "function") {
      await client.navigate(absolute);
    }
    return;
  }

  await self.clients.openWindow(absolute);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    event.notification.data &&
    typeof event.notification.data.url === "string" &&
    event.notification.data.url.startsWith("/")
      ? event.notification.data.url
      : "/";
  event.waitUntil(focusOrOpen(url));
});

self.addEventListener("notificationclose", () => {
  /* Reserved for analytics — no-op in MVP */
});
