import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { AI_SYSTEM_INSTRUCTION } from "@/features/ai/services/system-prompt";
import type {
  AiListingGrounding,
  AiParsedIntent,
} from "@/features/ai/types/ai-chat";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

import { formatListingsContext } from "./query-grounded-listings";

/** Ordered by reliability for new AI Studio accounts. */
const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
] as const;

const GEMINI_TIMEOUT_MS = 25_000;
const GEMINI_MAX_OUTPUT_TOKENS = 2048;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

type GeminiModel = (typeof GEMINI_MODELS)[number];
type GenerateContentResponse = Awaited<
  ReturnType<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>
>;

function extractAssistantText(
  response: GenerateContentResponse,
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

function buildModelConfig(model: GeminiModel) {
  const config = {
    systemInstruction: AI_SYSTEM_INSTRUCTION,
    temperature: 0.4,
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  };

  // Only disable thinking on full 3.5-flash; lite models do not use it.
  if (model === "gemini-3.5-flash") {
    return { ...config, thinkingConfig: { thinkingBudget: 0 } };
  }

  return config;
}

function getErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as {
        error?: { code?: number };
      };
      if (typeof parsed.error?.code === "number") {
        return parsed.error.code;
      }
    } catch {
      // Not JSON — ignore.
    }
  }

  return null;
}

function shouldTryNextModel(error: unknown): boolean {
  if (error instanceof Error && error.name === "TimeoutError") {
    return true;
  }

  const status = getErrorStatus(error);
  if (status == null) return false;

  // Model missing, deprecated, or overloaded — try the next one.
  if (status === 404 || status === 400) return true;
  if (RETRYABLE_STATUS.has(status)) return true;

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithModel(
  client: GoogleGenAI,
  model: GeminiModel,
  prompt: string,
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: buildModelConfig(model),
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    logger.warn("Gemini response hit max output tokens", {
      model,
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
  const failures: Array<{ model: GeminiModel; status: number | null }> = [];

  for (let index = 0; index < GEMINI_MODELS.length; index += 1) {
    const model = GEMINI_MODELS[index];
    if (!model) continue;

    try {
      const text = await generateWithModel(client, model, prompt);
      if (index > 0) {
        logger.info("Gemini fallback model succeeded", {
          model,
          attempt: index + 1,
        });
      }
      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const status = getErrorStatus(error);
      failures.push({ model, status });

      logger.warn("Gemini model request failed", {
        model,
        status,
        message: error instanceof Error ? error.message : String(error),
      });

      const hasNextModel = index < GEMINI_MODELS.length - 1;
      if (!hasNextModel || !shouldTryNextModel(error)) {
        break;
      }

      await sleep(350 * (index + 1));
    }
  }

  logger.error("All Gemini models failed for AI chat", {
    failures,
  });

  const lastFailure = failures[failures.length - 1];
  if (lastFailure?.status === 504) {
    throw new AppError(
      "Sorry, the AI assistant is temporarily unavailable. Please try again.",
      { code: "INTERNAL", status: 504 },
    );
  }

  throw new AppError(
    "Sorry, the AI assistant is temporarily unavailable. Please try again.",
    { code: "INTERNAL", status: 503 },
  );
}
