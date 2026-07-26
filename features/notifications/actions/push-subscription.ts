"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function savePushSubscriptionAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) return { ok: false };

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: profile.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      update: {
        userId: profile.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    });

    await prisma.profile.update({
      where: { id: profile.id },
      data: { notifyPushEnabled: true },
    });

    return { ok: true };
  } catch {
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
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
