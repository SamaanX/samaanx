import "server-only";

import { GoogleGenAI } from "@google/genai";

import { AI_SYSTEM_INSTRUCTION } from "@/features/ai/services/system-prompt";
import type {
  AiListingGrounding,
  AiParsedIntent,
} from "@/features/ai/types/ai-chat";
import { AppError } from "@/lib/errors/app-error";

import { formatListingsContext } from "./query-grounded-listings";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 25_000;

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
        maxOutputTokens: 700,
        abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    });

    const text = response.text?.trim();
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
