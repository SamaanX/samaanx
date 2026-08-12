import "server-only";

import { GoogleGenAI } from "@google/genai";

import { AI_SYSTEM_INSTRUCTION } from "@/features/ai/services/system-prompt";
import type {
  AiListingGrounding,
  AiParsedIntent,
} from "@/features/ai/types/ai-chat";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

import { formatListingsContext } from "./query-grounded-listings";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_TIMEOUT_MS = 25_000;
const GEMINI_MAX_OUTPUT_TOKENS = 2048;

function extractAssistantText(
  response: Awaited<
    ReturnType<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>
  >,
): string | undefined {
  const fromGetter = response.text?.trim();
  if (fromGetter) return fromGetter;

  const parts =
    response.candidates?.[0]?.content?.parts?.flatMap((part) => {
      if (!("text" in part) || typeof part.text !== "string") return [];
      if ("thought" in part && part.thought) return [];
      return [part.text];
    }) ?? [];

  const joined = parts.join("").trim();
  return joined.length > 0 ? joined : undefined;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      "Sorry, the AI assistant is temporarily unavailable. Please try again.",
      { code: "INTERNAL", status: 503 },
    );
  }

  return new GoogleGenAI({ apiKey });
}

export async function generateAiAssistantReply(params: {
  userMessage: string;
  listings: AiListingGrounding[];
  intent: AiParsedIntent;
}): Promise<string> {
  const listingsContext = formatListingsContext(params.listings, params.intent);
  const prompt = [
    listingsContext,
    "",
    "User question:",
    params.userMessage.trim(),
  ].join("\n");

  const client = getGeminiClient();

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: AI_SYSTEM_INSTRUCTION,
        temperature: 0.4,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (
      process.env.NODE_ENV !== "production" &&
      finishReason === "MAX_TOKENS"
    ) {
      logger.warn("Gemini response hit max output tokens", {
        model: GEMINI_MODEL,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      });
    }

    const text = extractAssistantText(response);
    if (!text) {
      throw new AppError(
        "Sorry, the AI assistant is temporarily unavailable. Please try again.",
        { code: "INTERNAL", status: 503 },
      );
    }

    return text;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.error("Gemini API request failed", {
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError(
        "Sorry, the AI assistant is temporarily unavailable. Please try again.",
        { code: "INTERNAL", status: 504 },
      );
    }

    throw new AppError(
      "Sorry, the AI assistant is temporarily unavailable. Please try again.",
      { code: "INTERNAL", status: 503, cause: error },
    );
  }
}
