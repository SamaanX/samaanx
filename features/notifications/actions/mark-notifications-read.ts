"use server";

import {
  markNotificationRead,
  markUserNotificationsRead,
} from "@/features/notifications/services/mark-read";
import { requireUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

/** Persist only — badge/list update via client cache + Realtime (no layout revalidate). */
export async function markNotificationsReadAction(): Promise<{
  ok: boolean;
}> {
  try {
    const { profile } = await requireUser();
    await markUserNotificationsRead(profile.id);
    return { ok: true };
  } catch (error) {
    logger.error("markNotificationsReadAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false };
  }
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    await markNotificationRead(profile.id, notificationId);
    return { ok: true };
  } catch (error) {
    logger.error("markNotificationReadAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
      notificationId,
    });
    return { ok: false };
  }
}
