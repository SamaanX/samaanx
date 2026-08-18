"use server";

import type { ReportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { adminReportActionSchema } from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import type { AdminActionResult } from "@/features/admin/types/admin";
import { scheduleChannelDelivery } from "@/features/notifications/services/dispatch";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function updateReportStatusAction(input: {
  reportId: string;
  status: ReportStatus;
  reason: string;
  resolutionNotes?: string;
}): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminReportActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { status: true, targetType: true, targetId: true },
    });
    if (!report) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Report not found." },
      };
    }

    await prisma.report.update({
      where: { id: parsed.data.reportId },
      data: {
        status: input.status,
        assignedAdminId: profile.id,
        resolutionNotes: parsed.data.resolutionNotes,
        resolvedAt: ["RESOLVED", "DISMISSED"].includes(input.status)
          ? new Date()
          : null,
      },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "report",
      entityId: parsed.data.reportId,
      reason: parsed.data.reason,
      previousValue: { status: report.status },
      newValue: {
        status: input.status,
        resolutionNotes: parsed.data.resolutionNotes,
      },
    });

    revalidatePath("/admin/reports");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update report." },
    };
  }
}

export async function warnReportUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
    const parsed = adminReportActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { targetType: true, targetId: true },
    });
    if (!report || report.targetType !== "USER") {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Report target is not a user." },
      };
    }

    await prisma.notification.create({
      data: {
        userId: report.targetId,
        type: "SECURITY_ALERT",
        channel: "IN_APP",
        status: "SENT",
        title: "Community guidelines warning",
        body: parsed.data.resolutionNotes ?? parsed.data.reason,
        deliveredAt: new Date(),
      },
    });

    scheduleChannelDelivery([
      {
        userId: report.targetId,
        type: "SECURITY_ALERT",
        title: "Community guidelines warning",
        body: parsed.data.resolutionNotes ?? parsed.data.reason,
        dedupeSeed: parsed.data.reportId,
      },
    ]);

    await updateReportStatusAction({
      reportId: parsed.data.reportId,
      status: "RESOLVED",
      reason: parsed.data.reason,
      resolutionNotes: parsed.data.resolutionNotes ?? "User warned.",
    });

    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not warn user." },
    };
  }
}

export async function banReportUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminReportActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { targetType: true, targetId: true },
    });
    if (!report || report.targetType !== "USER") {
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Report target is not a user." },
      };
    }

    await prisma.profile.update({
      where: { id: report.targetId },
      data: { status: "SUSPENDED" },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: report.targetId,
      reason: parsed.data.reason,
      newValue: {
        status: "SUSPENDED",
        via: "report_ban",
        reportId: parsed.data.reportId,
      },
    });

    await updateReportStatusAction({
      reportId: parsed.data.reportId,
      status: "RESOLVED",
      reason: parsed.data.reason,
      resolutionNotes: parsed.data.resolutionNotes ?? "Account suspended.",
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not ban user." },
    };
  }
}

export async function removeReportedListingAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminReportActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { targetType: true, targetId: true },
    });
    if (!report || report.targetType !== "LISTING") {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Report target is not a listing.",
        },
      };
    }

    await prisma.listing.update({
      where: { id: report.targetId },
      data: {
        moderationStatus: "HIDDEN",
        moderationReason: parsed.data.reason,
        moderatedById: profile.id,
        moderatedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    await updateReportStatusAction({
      reportId: parsed.data.reportId,
      status: "RESOLVED",
      reason: parsed.data.reason,
      resolutionNotes: parsed.data.resolutionNotes ?? "Listing removed.",
    });

    revalidatePath("/admin/listings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not remove listing." },
    };
  }
}
