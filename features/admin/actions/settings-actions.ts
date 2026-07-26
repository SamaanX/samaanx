"use server";

import { revalidatePath } from "next/cache";

import {
  adminGlobalSearch,
  getPlatformSettings,
} from "@/features/admin/queries/settings";
import {
  adminAnnouncementSchema,
  adminSearchSchema,
  adminSettingsSchema,
} from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import type {
  AdminActionResult,
  AdminSearchResult,
} from "@/features/admin/types/admin";
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
        target: parsed.data.target,
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

    await writeAdminActionLog({
      actorId: profile.id,
      entityType: "announcement",
      entityId: row.id,
      reason: "Announcement created",
      newValue: parsed.data,
    });

    revalidatePath("/admin/announcements");
    return { ok: true, data: { id: row.id } };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not create announcement." },
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
