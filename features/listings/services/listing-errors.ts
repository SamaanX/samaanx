import type { ListingActionError } from "@/features/listings/types/listing";
import { AppError, isAppError } from "@/lib/errors/app-error";

export function toListingActionError(error: unknown): ListingActionError {
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
      ? (error.code as ListingActionError["code"])
      : "INTERNAL";

    return { message: error.message, code };
  }

  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}

export function listingForbidden(): AppError {
  return new AppError("You do not own this listing.", {
    code: "FORBIDDEN",
    status: 403,
  });
}

export function listingNotFound(): AppError {
  return new AppError("Listing not found.", {
    code: "NOT_FOUND",
    status: 404,
  });
}
