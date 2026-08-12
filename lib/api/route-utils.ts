import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { isAppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  error: unknown,
  context?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    if (error.status >= 500) {
      Sentry.captureException(error, { extra: context });
      logger.error(error.message, { code: error.code, ...context });
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  Sentry.captureException(error, { extra: context });
  logger.error("Unhandled API error", {
    message: error instanceof Error ? error.message : "unknown_error",
    ...context,
  });

  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL",
        message,
      },
    },
    { status: 500 },
  );
}
