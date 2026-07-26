import type { ProfileActionError } from "@/features/profile/types/profile";
import { AppError, isAppError } from "@/lib/errors/app-error";

export function toProfileActionError(error: unknown): ProfileActionError {
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
      ? (error.code as ProfileActionError["code"])
      : "INTERNAL";

    return {
      message: error.message,
      code,
    };
  }

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("row level")
  ) {
    return {
      message: "You do not have permission to update this profile.",
      code: "FORBIDDEN",
    };
  }

  return {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL",
  };
}

export function unauthorizedProfileError(): AppError {
  return new AppError("You must be signed in to manage your profile.", {
    code: "UNAUTHORIZED",
    status: 401,
  });
}
