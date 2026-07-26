import type { NotificationType, Prisma } from "@prisma/client";

type NotifyParams = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  rentalId: string;
  listingId: string;
  payload?: Prisma.InputJsonValue;
};

export function buildInAppNotificationData(
  params: NotifyParams,
): Prisma.NotificationCreateManyInput {
  const now = new Date();
  return {
    userId: params.userId,
    type: params.type,
    channel: "IN_APP",
    status: "SENT",
    title: params.title,
    body: params.body,
    payload: params.payload,
    rentalId: params.rentalId,
    listingId: params.listingId,
    deliveredAt: now,
    sentAt: now,
  };
}
