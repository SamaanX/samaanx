"use server";

import { createFeedbackSchema } from "@/features/feedback/schemas/feedback";
import type { FeedbackActionResult } from "@/features/feedback/types/feedback";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function createFeedbackAction(
  input: unknown,
): Promise<FeedbackActionResult> {
  try {
    const { profile } = await requireUser();
    const parsed = createFeedbackSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid feedback.",
        },
      };
    }

    const row = await prisma.userFeedback.create({
      data: {
        userId: profile.id,
        category: parsed.data.category,
        subject: parsed.data.subject,
        message: parsed.data.message,
        pageUrl: parsed.data.pageUrl,
      },
      select: { id: true },
    });

    return { ok: true, data: { id: row.id } };
  } catch (error) {
    logger.error("createFeedbackAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Could not send feedback. Please try again.",
      },
    };
  }
}

export async function getMyFeedbackAction(): Promise<
  FeedbackActionResult<
    {
      id: string;
      category: string;
      subject: string;
      status: string;
      createdAt: string;
    }[]
  >
> {
  try {
    const { profile } = await requireUser();
    const rows = await prisma.userFeedback.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        category: r.category,
        subject: r.subject,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    logger.error("getMyFeedbackAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Could not load your feedback history.",
      },
    };
  }
}
