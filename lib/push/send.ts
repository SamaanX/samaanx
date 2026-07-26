import webpush from "web-push";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? "noreply@samaanx.com"}`,
    publicKey,
    privateKey,
  );
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configureWebPush()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
    take: 10,
  });

  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? payload.url,
  });

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
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          logger.warn("sendPushToUser failed", {
            userId,
            message: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    }),
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}
