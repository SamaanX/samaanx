import type { VerificationActionError } from "@/features/verification/types/verification";
import { AppError, isAppError } from "@/lib/errors/app-error";

export function toVerificationActionError(
  error: unknown,
): VerificationActionError {
  if (isAppError(error)) {
    const allowed = [
      "VALIDATION",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "INTERNAL",
    ] as const;
    const code = allowed.includes(error.code as (typeof allowed)[number])
      ? (error.code as VerificationActionError["code"])
      : "INTERNAL";
    return { message: error.message, code };
  }

  if (
    error instanceof Error &&
    error.message.includes("VERIFICATION_HMAC_SECRET")
  ) {
    return {
      message: "Verification is not configured. Set VERIFICATION_HMAC_SECRET.",
      code: "INTERNAL",
    };
  }

  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}

export function verificationForbidden(
  message = "You cannot access this verification.",
): AppError {
  return new AppError(message, { code: "FORBIDDEN", status: 403 });
}

export function verificationNotFound(): AppError {
  return new AppError("Verification not found.", {
    code: "NOT_FOUND",
    status: 404,
  });
}

export function verificationConflict(message: string): AppError {
  return new AppError(message, { code: "CONFLICT", status: 409 });
}

export function verificationValidation(message: string): AppError {
  return new AppError(message, { code: "VALIDATION", status: 400 });
}

export function verificationRateLimited(message: string): AppError {
  return new AppError(message, { code: "RATE_LIMITED", status: 429 });
}
