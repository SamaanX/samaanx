import { cache } from "react";

import {
  type NotificationView,
  toNotificationView,
} from "@/features/notifications/types/notification";
import { prisma } from "@/lib/db/prisma";

export const getNotificationsForUser = cache(
  async (userId: string, take = 50): Promise<NotificationView[]> => {
    const rows = await prisma.notification.findMany({
      where: { userId, channel: "IN_APP", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        userId: true,
        type: true,
        channel: true,
        status: true,
        title: true,
        body: true,
        payload: true,
        rentalId: true,
        listingId: true,
        deliveredAt: true,
        readAt: true,
        sentAt: true,
        failedReason: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    return rows.map(toNotificationView);
  },
);

export const getUnreadNotificationCount = cache(
  async (userId: string): Promise<number> => {
    return prisma.notification.count({
      where: {
        userId,
        channel: "IN_APP",
        deletedAt: null,
        readAt: null,
        status: { in: ["SENT", "PENDING"] },
      },
    });
  },
);
