import "server-only";

import { after } from "next/server";

import { resolveAnnouncementRecipientIds } from "@/features/announcements/services/recipients";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { sendPushBatchToUsers } from "@/lib/push/batch-send";
import { sanitizePushUrl } from "@/lib/push/validate-url";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";

const NOTIFY_CHUNK_SIZE = 250;

export type AnnouncementNotifyInput = {
  announcementId: string;
  title: string;
  body: string;
  targetUrl?: string | null;
  target: import("@prisma/client").AnnouncementTarget;
  targetUserId?: string | null;
};

export type AnnouncementDeliveryStats = {
  recipientCount: number;
  pushAttempted: number;
  pushSuccess: number;
  pushFailed: number;
  expiredRemoved: number;
};

function pushBodyPreview(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}

export async function fanOutAnnouncementNotifications(
  input: AnnouncementNotifyInput,
): Promise<AnnouncementDeliveryStats> {
  const userIds = await resolveAnnouncementRecipientIds(
    input.target,
    input.targetUserId,
  );

  const stats: AnnouncementDeliveryStats = {
    recipientCount: userIds.length,
    pushAttempted: 0,
    pushSuccess: 0,
    pushFailed: 0,
    expiredRemoved: 0,
  };

  if (userIds.length === 0) {
    return stats;
  }

  const now = new Date();
  const safeTargetUrl = sanitizePushUrl(input.targetUrl?.trim() || "/");
  const payload = {
    announcementId: input.announcementId,
    kind: "announcement" as const,
    targetUrl: safeTargetUrl,
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

  const pushStats = await sendPushBatchToUsers({
    userIds,
    title: input.title,
    body: pushBodyPreview(input.body),
    url: safeTargetUrl,
    type: "SYSTEM",
    notificationId: input.announcementId,
    dedupeKeyForUser: (userId) =>
      `push:announcement:${input.announcementId}:${userId}`,
    tagForUser: () => `announcement:${input.announcementId}`,
  });

  stats.pushAttempted = pushStats.pushAttempted;
  stats.pushSuccess = pushStats.pushSuccess;
  stats.pushFailed = pushStats.pushFailed;
  stats.expiredRemoved = pushStats.expiredRemoved;

  await prisma.announcement.update({
    where: { id: input.announcementId },
    data: {
      deliveryRecipientCount: stats.recipientCount,
      deliveryPushAttempted: stats.pushAttempted,
      deliveryPushSuccess: stats.pushSuccess,
      deliveryPushFailed: stats.pushFailed,
      deliveryExpiredRemoved: stats.expiredRemoved,
      deliveryCompletedAt: new Date(),
    },
  });

  return stats;
}

/** Non-blocking fan-out after admin mutations return. */
export function scheduleAnnouncementNotifications(
  input: AnnouncementNotifyInput,
): void {
  after(async () => {
    try {
      const stats = await fanOutAnnouncementNotifications(input);
      logger.info("Announcement broadcast delivered", {
        announcementId: input.announcementId,
        target: input.target,
        recipientCount: stats.recipientCount,
        pushAttempted: stats.pushAttempted,
        pushSuccess: stats.pushSuccess,
        pushFailed: stats.pushFailed,
        expiredRemoved: stats.expiredRemoved,
      });
    } catch (error) {
      logger.error("Announcement notification fan-out failed", {
        announcementId: input.announcementId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  });
}
