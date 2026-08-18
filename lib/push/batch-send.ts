import webpush from "web-push";

import { prisma } from "@/lib/db/prisma";
import { recordPushSent } from "@/lib/push/dedupe";
import { configureWebPush } from "@/lib/push/send";
import { sanitizePushUrl } from "@/lib/push/validate-url";

const SEND_CONCURRENCY = 40;

export type BatchPushStats = {
  pushAttempted: number;
  pushSuccess: number;
  pushFailed: number;
  expiredRemoved: number;
};

export type BatchPushInput = {
  userIds: string[];
  title: string;
  body: string;
  url: string;
  type: string;
  notificationId?: string;
  dedupeKeyForUser: (userId: string) => string;
  tagForUser: (userId: string) => string;
};

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      const current = items[currentIndex];
      if (current === undefined) continue;
      await worker(current);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker(),
  );
  await Promise.all(workers);
}

/** Batch push to many users — two DB reads, no per-user subscription queries. */
export async function sendPushBatchToUsers(
  input: BatchPushInput,
): Promise<BatchPushStats> {
  const stats: BatchPushStats = {
    pushAttempted: 0,
    pushSuccess: 0,
    pushFailed: 0,
    expiredRemoved: 0,
  };

  if (!configureWebPush() || input.userIds.length === 0) {
    return stats;
  }

  const uniqueUserIds = [...new Set(input.userIds)];

  const [eligibleProfiles, existingDedupes] = await Promise.all([
    prisma.profile.findMany({
      where: {
        id: { in: uniqueUserIds },
        notifyPushEnabled: true,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { id: true },
    }),
    prisma.pushSendLog.findMany({
      where: {
        dedupeKey: {
          in: uniqueUserIds.map((userId) => input.dedupeKeyForUser(userId)),
        },
      },
      select: { dedupeKey: true },
    }),
  ]);

  const eligibleUserIds = eligibleProfiles.map((row) => row.id);
  if (eligibleUserIds.length === 0) {
    return stats;
  }

  const dedupedUserIds = new Set(existingDedupes.map((row) => row.dedupeKey));
  const usersToNotify = eligibleUserIds.filter(
    (userId) => !dedupedUserIds.has(input.dedupeKeyForUser(userId)),
  );
  if (usersToNotify.length === 0) {
    return stats;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: usersToNotify } },
    select: {
      id: true,
      userId: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return stats;
  }

  const safeUrl = sanitizePushUrl(input.url);
  const usersWithSuccess = new Set<string>();

  await mapWithConcurrency(subscriptions, SEND_CONCURRENCY, async (sub) => {
    stats.pushAttempted += 1;
    const tag = input.tagForUser(sub.userId);
    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url: safeUrl,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      notificationId: input.notificationId,
      type: input.type,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      stats.pushSuccess += 1;
      usersWithSuccess.add(sub.userId);
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        stats.expiredRemoved += 1;
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        stats.pushFailed += 1;
      }
    }
  });

  await Promise.all(
    [...usersWithSuccess].map((userId) =>
      recordPushSent({
        userId,
        dedupeKey: input.dedupeKeyForUser(userId),
      }),
    ),
  );

  return stats;
}
