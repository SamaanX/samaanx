import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/lib/errors/app-error";

type ErrorBody = {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 201, ...init });
}

export function jsonError(error: unknown, init?: ResponseInit) {
  if (isAppError(error)) {
    const body: ErrorBody = {
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };

    return NextResponse.json(body, { status: error.status, ...init });
  }

  const body: ErrorBody = {
    error: {
      message: "An unexpected error occurred.",
      code: "INTERNAL",
    },
  };

  return NextResponse.json(body, { status: 500, ...init });
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, { code: "INTERNAL", cause: error });
  }

  return new AppError("An unexpected error occurred.", { code: "INTERNAL" });
}
