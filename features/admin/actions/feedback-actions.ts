"use server";

import type { FeedbackStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import type { AdminActionResult } from "@/features/admin/types/admin";
import { updateFeedbackStatusSchema } from "@/features/feedback/schemas/feedback";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function updateFeedbackStatusAction(input: {
  feedbackId: string;
  status: FeedbackStatus;
  reason: string;
  adminNotes?: string | null;
}): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = updateFeedbackStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const feedback = await prisma.userFeedback.findUnique({
      where: { id: parsed.data.feedbackId },
      select: { status: true, subject: true },
    });
    if (!feedback) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Feedback not found." },
      };
    }

    await prisma.userFeedback.update({
      where: { id: parsed.data.feedbackId },
      data: {
        status: parsed.data.status,
        assignedAdminId: profile.id,
        adminNotes: parsed.data.adminNotes,
        resolvedAt: ["RESOLVED", "DISMISSED"].includes(parsed.data.status)
          ? new Date()
          : null,
      },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "feedback",
      entityId: parsed.data.feedbackId,
      reason: parsed.data.reason,
      previousValue: { status: feedback.status },
      newValue: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes,
      },
    });

    revalidatePath("/admin/feedback");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update feedback." },
    };
  }
}
