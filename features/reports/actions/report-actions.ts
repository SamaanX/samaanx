"use server";

import type { ReportTargetType } from "@prisma/client";

import { createReportSchema } from "@/features/reports/schemas/report";
import type { ReportActionResult } from "@/features/reports/types/report";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function createReportAction(
  input: unknown,
): Promise<ReportActionResult> {
  try {
    const { profile } = await requireUser();
    const parsed = createReportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid report.",
        },
      };
    }

    let targetType: ReportTargetType = parsed.data
      .targetType as ReportTargetType;
    let targetId = parsed.data.targetId;
    let rentalId = parsed.data.rentalId ?? null;
    let details = parsed.data.details ?? null;
    const { type, reason } = parsed.data;

    if (parsed.data.targetType === "REVIEW") {
      const review = await prisma.review.findFirst({
        where: { id: parsed.data.targetId },
        select: {
          id: true,
          reviewerId: true,
          rentalId: true,
        },
      });
      if (!review) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Review not found." },
        };
      }
      // Persist without a new enum value: attribute to the review author.
      targetType = "USER";
      targetId = review.reviewerId;
      rentalId = rentalId ?? review.rentalId;
      details = [`Reported review ${review.id}.`, details]
        .filter(Boolean)
        .join(" ");
    }

    if (targetType === "USER" && targetId === profile.id) {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "You cannot report yourself." },
      };
    }

    if (targetType === "LISTING") {
      const listing = await prisma.listing.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      if (!listing) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Listing not found." },
        };
      }
    } else if (targetType === "USER") {
      const user = await prisma.profile.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      if (!user) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "User not found." },
        };
      }
    } else if (targetType === "RENTAL") {
      const rental = await prisma.rental.findFirst({
        where: { id: targetId },
        select: { id: true },
      });
      if (!rental) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Rental not found." },
        };
      }
    } else if (targetType === "MESSAGE") {
      const message = await prisma.message.findFirst({
        where: { id: targetId },
        select: { id: true },
      });
      if (!message) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Message not found." },
        };
      }
    }

    const report = await prisma.report.create({
      data: {
        reporterId: profile.id,
        type,
        targetType,
        targetId,
        rentalId,
        reason,
        details,
        status: "OPEN",
      },
      select: { id: true },
    });

    return { ok: true, data: { reportId: report.id } };
  } catch (error) {
    logger.error("createReportAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Could not submit report. Please try again.",
      },
    };
  }
}
