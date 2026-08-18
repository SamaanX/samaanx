import "server-only";

import { APP_TAGLINE } from "@/config/constants";
import { sendWelcomeEmailForUser } from "@/features/jobs/processor";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push/send";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";

export function buildWelcomeNotificationCopy(displayName: string): {
  title: string;
  body: string;
  pushBody: string;
} {
  const name = displayName.trim() || "there";
  return {
    title: `Welcome, ${name}!`,
    body: `${APP_TAGLINE}. SamaanX par aapka swagat hai — browse nearby rentals or list your items to start earning.`,
    pushBody: `${APP_TAGLINE} — welcome to SamaanX, ${name}!`,
  };
}

/** Idempotent welcome delivery: in-app notification, push, and email. */
export async function sendWelcomeForUser(params: {
  userId: string;
  email: string;
  displayName: string;
}): Promise<void> {
  try {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: "SYSTEM",
        payload: {
          path: ["kind"],
          equals: "welcome",
        },
      },
      select: { id: true },
    });

    if (!existing) {
      const copy = buildWelcomeNotificationCopy(params.displayName);
      const now = new Date();

      await prisma.notification.create({
        data: {
          userId: params.userId,
          type: "SYSTEM",
          channel: "IN_APP",
          status: "SENT",
          title: copy.title,
          body: copy.body,
          payload: { kind: "welcome" },
          deliveredAt: now,
          sentAt: now,
        },
      });

      scheduleLiveSyncAfterResponse([params.userId]);

      void sendPushToUser(params.userId, {
        title: copy.title,
        body: copy.pushBody,
        url: "/",
        tag: `welcome:${params.userId}`,
        dedupeKey: `push:welcome:${params.userId}`,
        type: "SYSTEM",
      });
    }

    await sendWelcomeEmailForUser(params);
  } catch (error) {
    logger.warn("sendWelcomeForUser failed", {
      userId: params.userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
