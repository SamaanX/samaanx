import type { RentalActionError } from "@/features/rentals/types/rental";
import { AppError, isAppError } from "@/lib/errors/app-error";

export function toRentalActionError(error: unknown): RentalActionError {
  if (isAppError(error)) {
    const allowed = [
      "VALIDATION",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "INTERNAL",
    ] as const;
    const code = allowed.includes(error.code as (typeof allowed)[number])
      ? (error.code as RentalActionError["code"])
      : "INTERNAL";
    return { message: error.message, code };
  }

  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}

export function rentalForbidden(
  message = "You cannot perform this action.",
): AppError {
  return new AppError(message, { code: "FORBIDDEN", status: 403 });
}

export function rentalNotFound(): AppError {
  return new AppError("Rental not found.", { code: "NOT_FOUND", status: 404 });
}

export function rentalConflict(message: string): AppError {
  return new AppError(message, { code: "CONFLICT", status: 409 });
}

export function rentalValidation(message: string): AppError {
  return new AppError(message, { code: "VALIDATION", status: 400 });
}
