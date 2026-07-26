import type { TrustActionError } from "@/features/reviews/types/review";
import { AppError } from "@/lib/errors/app-error";

export function toReviewActionError(error: unknown): TrustActionError {
  if (error instanceof AppError) {
    const code = error.code;
    if (
      code === "VALIDATION" ||
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      code === "NOT_FOUND" ||
      code === "CONFLICT"
    ) {
      return { code, message: error.message };
    }
  }
  return {
    code: "INTERNAL",
    message: "Something went wrong. Please try again.",
  };
}
