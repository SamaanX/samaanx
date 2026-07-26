"use server";

import { revalidatePath } from "next/cache";

import {
  adminRoleChangeSchema,
  adminUserActionSchema,
} from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import { hasAdminPermission } from "@/features/admin/services/permissions";
import type { AdminActionResult } from "@/features/admin/types/admin";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function suspendUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    if (!hasAdminPermission(profile.role, "users.manage")) {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "No permission." },
      };
    }

    const parsed = adminUserActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const target = await prisma.profile.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, status: true, role: true, email: true },
    });
    if (!target || target.role === "SUPER_ADMIN") {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "Cannot suspend this user." },
      };
    }

    await prisma.profile.update({
      where: { id: parsed.data.userId },
      data: { status: "SUSPENDED" },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: parsed.data.userId,
      reason: parsed.data.reason,
      previousValue: { status: target.status },
      newValue: { status: "SUSPENDED" },
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (error) {
    logger.error("suspendUserAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not suspend user." },
    };
  }
}

export async function unsuspendUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminUserActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const target = await prisma.profile.findUnique({
      where: { id: parsed.data.userId },
      select: { status: true },
    });

    await prisma.profile.update({
      where: { id: parsed.data.userId },
      data: { status: "ACTIVE" },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: parsed.data.userId,
      reason: parsed.data.reason,
      previousValue: { status: target?.status },
      newValue: { status: "ACTIVE" },
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (_error) {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not unsuspend user." },
    };
  }
}

export async function softDeleteUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminUserActionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const target = await prisma.profile.findUnique({
      where: { id: parsed.data.userId },
      select: { role: true, deletedAt: true },
    });
    if (target?.role === "SUPER_ADMIN") {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "Cannot delete super admin." },
      };
    }

    await prisma.profile.update({
      where: { id: parsed.data.userId },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: parsed.data.userId,
      reason: parsed.data.reason,
      previousValue: { deletedAt: target?.deletedAt },
      newValue: { deletedAt: new Date().toISOString(), status: "DELETED" },
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (_error) {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not delete user." },
    };
  }
}

export async function updateUserRoleAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireSuperAdmin();
    const parsed = adminRoleChangeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    if (
      parsed.data.userId === profile.id &&
      parsed.data.role !== "SUPER_ADMIN"
    ) {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "Cannot demote yourself." },
      };
    }

    const target = await prisma.profile.findUnique({
      where: { id: parsed.data.userId },
      select: { role: true },
    });

    await prisma.profile.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: parsed.data.userId,
      reason: parsed.data.reason,
      previousValue: { role: target?.role },
      newValue: { role: parsed.data.role },
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (_error) {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update role." },
    };
  }
}

export async function updateSellerVerificationAction(input: {
  userId: string;
  verificationBadge: "UNVERIFIED" | "PENDING" | "VERIFIED";
  reason: string;
}): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    if (!hasAdminPermission(profile.role, "sellers.manage")) {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "No permission." },
      };
    }

    const target = await prisma.profile.findUnique({
      where: { id: input.userId },
      select: { verificationBadge: true },
    });

    await prisma.profile.update({
      where: { id: input.userId },
      data: { verificationBadge: input.verificationBadge },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "profile",
      entityId: input.userId,
      reason: input.reason,
      previousValue: { verificationBadge: target?.verificationBadge },
      newValue: { verificationBadge: input.verificationBadge },
    });

    revalidatePath("/admin/users");
    return { ok: true, data: undefined };
  } catch (_error) {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update verification." },
    };
  }
}
