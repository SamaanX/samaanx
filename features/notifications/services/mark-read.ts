import { prisma } from "@/lib/db/prisma";

/** Persist read state only — safe to call from Server Components (no revalidatePath). */
export async function markUserNotificationsRead(
  userId: string,
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      channel: "IN_APP",
      readAt: null,
    },
    data: {
      readAt: new Date(),
      status: "READ",
    },
  });

  return result.count;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      channel: "IN_APP",
      readAt: null,
    },
    data: {
      readAt: new Date(),
      status: "READ",
    },
  });

  return result.count > 0;
}
