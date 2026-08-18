"use server";

import { revalidatePath } from "next/cache";

import {
  adminGlobalSearch,
  getPlatformSettings,
} from "@/features/admin/queries/settings";
import {
  adminAnnouncementSchema,
  adminAnnouncementUpdateSchema,
  adminSearchSchema,
  adminSettingsSchema,
} from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import type {
  AdminActionResult,
  AdminSearchResult,
} from "@/features/admin/types/admin";
import { scheduleAnnouncementNotifications } from "@/features/announcements/services/notify";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function updatePlatformSettingsAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireSuperAdmin();
    const parsed = adminSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const previous = await getPlatformSettings();

    await prisma.platformSetting.upsert({
      where: { key: "marketplace" },
      create: {
        key: "marketplace",
        value: parsed.data,
        updatedById: profile.id,
      },
      update: {
        value: parsed.data,
        updatedById: profile.id,
      },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "platform_settings",
      entityId: profile.id,
      reason: "System settings updated",
      previousValue: previous,
      newValue: parsed.data,
    });

    revalidatePath("/admin/settings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not save settings." },
    };
  }
}

export async function createAnnouncementAction(
  input: unknown,
): Promise<AdminActionResult<{ id: string }>> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const row = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        targetUrl: parsed.data.targetUrl?.trim() || null,
        target: parsed.data.target,
        targetUserId:
          parsed.data.target === "USER" ? parsed.data.targetUserId : null,
        dismissible: parsed.data.dismissible,
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt
          ? new Date(parsed.data.startsAt)
          : new Date(),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        createdById: profile.id,
      },
      select: { id: true },
    });

    if (parsed.data.isActive) {
      scheduleAnnouncementNotifications({
        announcementId: row.id,
        title: parsed.data.title,
        body: parsed.data.body,
        targetUrl: parsed.data.targetUrl,
        target: parsed.data.target,
        targetUserId: parsed.data.targetUserId,
      });
    }

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "announcement",
      entityId: row.id,
      reason: "Announcement created",
      newValue: parsed.data,
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: row.id } };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not create announcement." },
    };
  }
}

export async function updateAnnouncementAction(
  input: unknown,
): Promise<AdminActionResult<{ id: string }>> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminAnnouncementUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const existing = await prisma.announcement.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    });
    if (!existing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Announcement not found." },
      };
    }

    await prisma.announcement.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        targetUrl: parsed.data.targetUrl?.trim() || null,
        target: parsed.data.target,
        targetUserId:
          parsed.data.target === "USER" ? parsed.data.targetUserId : null,
        dismissible: parsed.data.dismissible,
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt
          ? new Date(parsed.data.startsAt)
          : undefined,
        endsAt:
          parsed.data.endsAt === undefined
            ? undefined
            : parsed.data.endsAt
              ? new Date(parsed.data.endsAt)
              : null,
      },
    });

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "announcement",
      entityId: parsed.data.id,
      reason: "Announcement updated",
      newValue: parsed.data,
    });

    if (parsed.data.isActive && parsed.data.notifyUsers) {
      scheduleAnnouncementNotifications({
        announcementId: parsed.data.id,
        title: parsed.data.title,
        body: parsed.data.body,
        targetUrl: parsed.data.targetUrl,
        target: parsed.data.target,
        targetUserId: parsed.data.targetUserId,
      });
    }

    revalidatePath("/admin/announcements");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: parsed.data.id } };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not update announcement." },
    };
  }
}

export async function adminSearchAction(
  input: unknown,
): Promise<AdminActionResult<AdminSearchResult>> {
  try {
    await requireAdmin();
    const parsed = adminSearchSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const results = await adminGlobalSearch(parsed.data.q);
    return { ok: true, data: results };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Search failed." },
    };
  }
}
