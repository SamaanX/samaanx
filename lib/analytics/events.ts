/** Client-safe analytics event names — no PII in payloads. */
export type AnalyticsEvent =
  | "signup"
  | "login"
  | "create_listing"
  | "wishlist_add"
  | "wishlist_remove"
  | "rental_request"
  | "rental_approve"
  | "chat_started"
  | "rental_completed"
  | "review_submitted"
  | "search"
  | "filter_apply"
  | "share_listing"
  | "pwa_install";

export type AnalyticsPayload = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

let lastEventKey = "";

export function trackEvent(
  name: AnalyticsEvent,
  payload?: AnalyticsPayload,
): void {
  if (typeof window === "undefined") return;

  const key = `${name}:${JSON.stringify(payload ?? {})}`;
  if (key === lastEventKey) return;
  lastEventKey = key;
  setTimeout(() => {
    if (lastEventKey === key) lastEventKey = "";
  }, 500);

  const safe = sanitizePayload(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", name, safe);
  }

  if (typeof window.clarity === "function") {
    window.clarity("event", name);
  }
}

function sanitizePayload(
  payload?: AnalyticsPayload,
): AnalyticsPayload | undefined {
  if (!payload) return undefined;
  const blocked = new Set(["email", "phone", "password", "token", "message"]);
  const out: AnalyticsPayload = {};
  for (const [k, v] of Object.entries(payload)) {
    if (blocked.has(k.toLowerCase())) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
