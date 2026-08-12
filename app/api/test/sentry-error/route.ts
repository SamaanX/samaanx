import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

/**
 * Development/testing endpoint — throws a real error for Sentry verification.
 * Disabled in production unless ENABLE_SENTRY_TEST=1 and Bearer CRON_SECRET is provided.
 */
function isAllowed(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (process.env.ENABLE_SENTRY_TEST !== "1") {
    return false;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAllowed(request)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message:
            "Sentry test endpoint is disabled in production. Set ENABLE_SENTRY_TEST=1 and send Authorization: Bearer CRON_SECRET to enable.",
        },
      }),
      {
        status: 404,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const error = new Error(
    "SamaanX Sentry test error — intentional throw from GET /api/test/sentry-error",
  );

  Sentry.captureException(error);
  await Sentry.flush(2000);
  throw error;
}
