import webpush from "web-push";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { hasPushBeenSent, recordPushSent } from "@/lib/push/dedupe";
import { sanitizePushUrl } from "@/lib/push/validate-url";

function vapidSubject(): string {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit) {
    return explicit.startsWith("mailto:") ? explicit : `mailto:${explicit}`;
  }
  const from = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1];
  return `mailto:${from ?? "noreply@samaanx.com"}`;
}

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  notificationId?: string;
  type?: string;
  dedupeKey?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configureWebPush()) return;

  if (payload.dedupeKey) {
    if (await hasPushBeenSent(payload.dedupeKey)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          JSON.stringify({
            level: "debug",
            message: "push.send.skipped",
            reason: "dedupe",
            userId,
          }),
        );
      }
      return;
    }
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) return;

  const safeUrl = sanitizePushUrl(payload.url);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: safeUrl,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag ?? safeUrl,
    notificationId: payload.notificationId,
    type: payload.type,
  });

  let sentCount = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sentCount += 1;
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          if (process.env.NODE_ENV === "development") {
            console.warn(
              JSON.stringify({
                level: "debug",
                message: "push.subscription.expired",
                userId,
                subscriptionId: sub.id,
              }),
            );
          }
        } else {
          logger.warn("push.send.failure", {
            userId,
            subscriptionId: sub.id,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }),
  );

  if (sentCount > 0 && payload.dedupeKey) {
    await recordPushSent({ userId, dedupeKey: payload.dedupeKey });
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      JSON.stringify({
        level: "debug",
        message: sentCount > 0 ? "push.send.success" : "push.send.failure",
        userId,
        devices: subs.length,
        delivered: sentCount,
      }),
    );
  }
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

/** Server-side push entry — non-blocking, never throws. */
export function sendPushNotification(
  userId: string,
  payload: PushPayload,
): void {
  void sendPushToUser(userId, payload).catch((error) => {
    logger.warn("sendPushNotification failed", {
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  });
}
