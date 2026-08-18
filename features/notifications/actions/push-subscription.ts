"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(512).optional(),
});

export async function savePushSubscriptionAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          JSON.stringify({
            level: "debug",
            message: "push.subscribe.failure",
            reason: "validation",
          }),
        );
      }
      return { ok: false };
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: profile.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? null,
      },
      update: {
        userId: profile.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? null,
      },
    });

    await prisma.profile.update({
      where: { id: profile.id },
      data: { notifyPushEnabled: true },
    });

    if (process.env.NODE_ENV === "development") {
      console.warn(
        JSON.stringify({
          level: "debug",
          message: "push.subscribe.success",
          userId: profile.id,
        }),
      );
    }

    return { ok: true };
  } catch (error) {
    logger.warn("push.subscribe.failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false };
  }
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: profile.id },
    });
    if (process.env.NODE_ENV === "development") {
      console.warn(
        JSON.stringify({
          level: "debug",
          message: "push.subscription.removed",
          userId: profile.id,
        }),
      );
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Remove all push subscriptions for the logged-in user (disable flow). */
export async function removeAllPushSubscriptionsAction(): Promise<{
  ok: boolean;
}> {
  try {
    const { profile } = await requireUser();
    await prisma.pushSubscription.deleteMany({
      where: { userId: profile.id },
    });
    await prisma.profile.update({
      where: { id: profile.id },
      data: { notifyPushEnabled: false },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
