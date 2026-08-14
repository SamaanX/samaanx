import "server-only";

import { after } from "next/server";

import { resolveAnnouncementRecipientIds } from "@/features/announcements/services/recipients";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";

const NOTIFY_CHUNK_SIZE = 250;

export type AnnouncementNotifyInput = {
  announcementId: string;
  title: string;
  body: string;
  target: import("@prisma/client").AnnouncementTarget;
  targetUserId?: string | null;
};

export async function fanOutAnnouncementNotifications(
  input: AnnouncementNotifyInput,
): Promise<number> {
  const userIds = await resolveAnnouncementRecipientIds(
    input.target,
    input.targetUserId,
  );

  if (userIds.length === 0) {
    return 0;
  }

  const now = new Date();
  const payload = {
    announcementId: input.announcementId,
    kind: "announcement" as const,
  };

  for (let index = 0; index < userIds.length; index += NOTIFY_CHUNK_SIZE) {
    const chunk = userIds.slice(index, index + NOTIFY_CHUNK_SIZE);
    await prisma.notification.createMany({
      data: chunk.map((userId) => ({
        userId,
        type: "SYSTEM",
        channel: "IN_APP",
        status: "SENT",
        title: input.title,
        body: input.body,
        payload,
        deliveredAt: now,
        sentAt: now,
      })),
    });
    scheduleLiveSyncAfterResponse(chunk);
  }

  return userIds.length;
}

/** Non-blocking fan-out after admin mutations return. */
export function scheduleAnnouncementNotifications(
  input: AnnouncementNotifyInput,
): void {
  after(async () => {
    try {
      const count = await fanOutAnnouncementNotifications(input);
      logger.info("Announcement notifications delivered", {
        announcementId: input.announcementId,
        target: input.target,
        recipientCount: count,
      });
    } catch (error) {
      logger.error("Announcement notification fan-out failed", {
        announcementId: input.announcementId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });
}
