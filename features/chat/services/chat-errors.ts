import type { ChatActionError } from "@/features/chat/types/chat";
import { AppError } from "@/lib/errors/app-error";

export function toChatActionError(error: unknown): ChatActionError {
  if (error instanceof AppError) {
    const code = error.code;
    if (
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      code === "NOT_FOUND" ||
      code === "CONFLICT" ||
      code === "VALIDATION"
    ) {
      return { code, message: error.message };
    }
    return { code: "INTERNAL", message: error.message };
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "READONLY") {
      return {
        code: "READONLY",
        message:
          error instanceof Error
            ? error.message
            : "This conversation is read-only.",
      };
    }
  }
  return {
    code: "INTERNAL",
    message: "Something went wrong. Please try again.",
  };
}

export function chatReadonlyError(): AppError {
  return new AppError("This conversation is read-only.", {
    code: "FORBIDDEN",
    status: 403,
  });
}
