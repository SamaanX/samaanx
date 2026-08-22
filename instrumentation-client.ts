import * as Sentry from "@sentry/nextjs";

const isBrowserExtension =
  typeof window !== "undefined" &&
  "chrome" in window &&
  Boolean(
    (window as Window & { chrome?: { runtime?: { id?: string } } }).chrome
      ?.runtime?.id,
  );

if (!isBrowserExtension && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
