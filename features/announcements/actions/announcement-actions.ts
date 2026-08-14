"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";
import type { AppUiMode } from "@/lib/ui/app-mode";

export async function dismissAnnouncementAction(
  announcementId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, message: "Sign in to dismiss announcements." };
  }

  try {
    await prisma.announcementDismissal.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: profile.id,
        },
      },
      create: {
        announcementId,
        userId: profile.id,
      },
      update: {},
    });

    scheduleLiveSyncAfterResponse([profile.id]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not dismiss announcement." };
  }
}

export async function dismissAnnouncementForModeAction(
  announcementId: string,
  _mode: AppUiMode,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return dismissAnnouncementAction(announcementId);
}
