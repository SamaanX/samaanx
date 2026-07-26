import { getPublicEnv } from "@/config/env";

/**
 * OAuth / password-reset must return to the site the user is actually on.
 * Falls back to NEXT_PUBLIC_APP_URL when origin is missing or untrusted.
 */
export function resolveAuthRedirectOrigin(clientOrigin?: string): string {
  const fallback = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  if (!clientOrigin?.trim()) {
    return fallback;
  }

  try {
    const client = new URL(clientOrigin);
    const env = new URL(fallback);

    if (client.origin === env.origin) {
      return client.origin;
    }

    if (client.hostname === "localhost" || client.hostname === "127.0.0.1") {
      return client.origin;
    }

    if (client.hostname.endsWith(".vercel.app")) {
      return client.origin;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
