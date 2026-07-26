"use server";

import { revalidatePath } from "next/cache";

import { adminDisputeUpdateSchema } from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import type { AdminActionResult } from "@/features/admin/types/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function updateDisputeAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminDisputeUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: parsed.data.disputeId },
      select: { status: true, rentalId: true },
    });
    if (!dispute) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Dispute not found." },
      };
    }

    await prisma.dispute.update({
      where: { id: parsed.data.disputeId },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes,
        resolution: parsed.data.resolution,
        assignedAdminId: profile.id,
        resolvedAt: ["RESOLVED", "REJECTED"].includes(parsed.data.status)
          ? new Date()
          : null,
      },
    });

    if (parsed.data.status === "RESOLVED") {
      await prisma.rental.update({
        where: { id: dispute.rentalId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "dispute",
      entityId: parsed.data.disputeId,
      reason: parsed.data.reason,
      previousValue: { status: dispute.status },
      newValue: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes,
        resolution: parsed.data.resolution,
      },
    });

    revalidatePath("/admin/disputes");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update dispute." },
    };
  }
}

export async function createDisputeFromRentalAction(input: {
  rentalId: string;
  openedById: string;
  buyerStatement?: string;
  sellerStatement?: string;
}): Promise<AdminActionResult<{ disputeId: string }>> {
  try {
    await requireAdmin();

    const rental = await prisma.rental.findUnique({
      where: { id: input.rentalId },
      select: { id: true, status: true },
    });
    if (!rental) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Rental not found." },
      };
    }

    const dispute = await prisma.dispute.create({
      data: {
        rentalId: input.rentalId,
        openedById: input.openedById,
        buyerStatement: input.buyerStatement,
        sellerStatement: input.sellerStatement,
        status: "OPEN",
      },
      select: { id: true },
    });

    await prisma.rental.update({
      where: { id: input.rentalId },
      data: { status: "DISPUTED", disputedAt: new Date() },
    });

    revalidatePath("/admin/disputes");
    return { ok: true, data: { disputeId: dispute.id } };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not create dispute." },
    };
  }
}
