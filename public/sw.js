/* SamaanX service worker — offline shell + Web Push (Phase 12).
 * Does NOT cache API, chat, rental, notification, or auth responses. */

const CACHE_NAME = "samaanx-shell-v1";
const SHELL_URLS = ["/", "/manifest.webmanifest"];

const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/chat",
  "/rentals",
  "/notifications",
  "/seller/",
  "/admin/",
  "/auth/",
];

function shouldNeverCache(pathname) {
  return NEVER_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldNeverCache(url.pathname)) return;
  if (url.pathname.includes(".")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }
        return Response.error();
      }),
  );
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
