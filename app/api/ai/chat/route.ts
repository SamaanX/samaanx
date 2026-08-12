import { handleAiChatRequest } from "@/features/ai/services/handle-ai-chat";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await handleAiChatRequest(body);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(
        new AppError("Invalid request body.", {
          code: "VALIDATION",
          status: 400,
        }),
        { route: "POST /api/ai/chat" },
      );
    }

    return apiError(error, { route: "POST /api/ai/chat" });
  }
}
