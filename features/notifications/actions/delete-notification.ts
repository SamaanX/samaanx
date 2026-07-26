"use server";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function deleteNotificationAction(
  notificationId: string,
): Promise<{ ok: boolean }> {
  try {
    const { profile } = await requireUser();
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: profile.id,
        channel: "IN_APP",
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
