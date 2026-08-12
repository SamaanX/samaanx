import { z } from "zod";

import { generateAiAssistantReply } from "@/features/ai/services/gemini-client";
import { parseUserIntent } from "@/features/ai/services/parse-intent";
import { queryGroundedListings } from "@/features/ai/services/query-grounded-listings";
import { getActiveCategories } from "@/features/listings/queries/categories";
import { AppError } from "@/lib/errors/app-error";

export const aiChatRequestSchema = z.object({
  message: z
    .string({
      required_error: "Message is required.",
      invalid_type_error: "Message must be a string.",
    })
    .trim()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message must be 1000 characters or fewer."),
});

export async function handleAiChatRequest(rawBody: unknown) {
  if (rawBody == null || typeof rawBody !== "object") {
    throw new AppError("Invalid request body.", {
      code: "VALIDATION",
      status: 400,
    });
  }

  const parsed = aiChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
    throw new AppError(message, { code: "VALIDATION", status: 400 });
  }

  const categories = await getActiveCategories();
  const intent = parseUserIntent(parsed.data.message, categories);
  const listings = await queryGroundedListings(intent);
  const message = await generateAiAssistantReply({
    userMessage: parsed.data.message,
    listings,
    intent,
  });

  return { message };
}
