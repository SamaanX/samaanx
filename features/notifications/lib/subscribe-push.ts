import { getVapidPublicKey } from "@/lib/push/public";

export type PushPermissionState = NotificationPermission | "unsupported";

export type PushCapability = {
  supported: boolean;
  permission: PushPermissionState;
  vapidConfigured: boolean;
};

export function getPushCapability(): PushCapability {
  if (typeof window === "undefined") {
    return {
      supported: false,
      permission: "unsupported",
      vapidConfigured: false,
    };
  }

  const supported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  return {
    supported,
    permission: supported ? Notification.permission : "unsupported",
    vapidConfigured: Boolean(getVapidPublicKey()),
  };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export type SubscribePushResult =
  | {
      ok: true;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }
  | {
      ok: false;
      reason:
        "unsupported" | "no_vapid" | "denied" | "dismissed" | "save_failed";
    };

export async function subscribeToPushNotifications(): Promise<SubscribePushResult> {
  const capability = getPushCapability();
  if (!capability.supported) {
    return { ok: false, reason: "unsupported" };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, reason: "no_vapid" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason: permission === "denied" ? "denied" : "dismissed",
    };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "save_failed" };
  }

  return {
    ok: true,
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
}

export async function getCurrentPushEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}
