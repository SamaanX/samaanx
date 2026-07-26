import type { AuthError } from "@supabase/supabase-js";

import type { AuthActionError } from "@/features/auth/types/auth";
import { AppError } from "@/lib/errors/app-error";

const MESSAGE_MAP: Record<string, string> = {
  "Invalid login credentials": "Email or password is incorrect.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "User already registered": "An account with this email already exists.",
  "Password should be at least 6 characters":
    "Password does not meet security requirements.",
  "Signup requires a valid password":
    "Password does not meet security requirements.",
  "For security purposes, you can only request this after":
    "Please wait a moment before trying again.",
  "New password should be different from the old password.":
    "Choose a password you have not used before.",
};

export function mapAuthError(error: AuthError | Error | unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "Authentication failed.";

  for (const [needle, friendly] of Object.entries(MESSAGE_MAP)) {
    if (message.includes(needle)) {
      const code =
        needle === "Invalid login credentials"
          ? "UNAUTHORIZED"
          : needle === "User already registered"
            ? "CONFLICT"
            : "VALIDATION";

      return new AppError(friendly, {
        code,
        status: code === "UNAUTHORIZED" ? 401 : code === "CONFLICT" ? 409 : 400,
        cause: error,
      });
    }
  }

  if (message.toLowerCase().includes("rate limit")) {
    return new AppError("Too many attempts. Please try again later.", {
      code: "RATE_LIMITED",
      status: 429,
      cause: error,
    });
  }

  return new AppError("Something went wrong. Please try again.", {
    code: "INTERNAL",
    status: 500,
    cause: error,
  });
}

export function toAuthActionError(error: unknown): AuthActionError {
  const appError = mapAuthError(error);

  const allowed = [
    "VALIDATION",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "CONFLICT",
    "NOT_FOUND",
    "INTERNAL",
  ] as const;

  const code = allowed.includes(appError.code as (typeof allowed)[number])
    ? (appError.code as AuthActionError["code"])
    : "INTERNAL";

  return {
    message: appError.message,
    code,
  };
}
