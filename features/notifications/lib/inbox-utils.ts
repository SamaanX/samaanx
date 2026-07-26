import type { NotificationType } from "@prisma/client";

import type { NotificationFilter } from "@/features/notifications/services/notification-filter";
import { notificationMatchesFilter } from "@/features/notifications/services/notification-filter";
import type { NotificationView } from "@/features/notifications/types/notification";

export type NotificationGroup = {
  label: string;
  items: NotificationView[];
};

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  RENTAL_REQUESTED: "Rental",
  RENTAL_APPROVED: "Rental",
  RENTAL_REJECTED: "Rental",
  RENTAL_CANCELLED: "Rental",
  VERIFICATION_READY: "Rental",
  HANDOVER_COMPLETED: "Rental",
  RETURN_COMPLETED: "Rental",
  NEW_MESSAGE: "Chat",
  REVIEW_REMINDER: "Review",
  SYSTEM: "System",
  SECURITY_ALERT: "Security",
  ACCOUNT_CHANGE: "Account",
};

export function getNotificationCategoryLabel(type: NotificationType): string {
  return TYPE_LABELS[type] ?? "Update";
}

export function filterNotifications(
  items: NotificationView[],
  filter: NotificationFilter,
): NotificationView[] {
  return items.filter((item) =>
    notificationMatchesFilter(item.type, filter, item.readAt),
  );
}

export function groupNotificationsByDate(
  items: NotificationView[],
): NotificationGroup[] {
  const groups = new Map<string, NotificationView[]>();
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  for (const item of items) {
    const date = new Date(item.createdAt);
    const key =
      date.toDateString() === today
        ? "Today"
        : date.toDateString() === yesterdayKey
          ? "Yesterday"
          : "Earlier";
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  const order = ["Today", "Yesterday", "Earlier"];
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }));
}

export const NOTIFICATION_FILTER_OPTIONS: Array<{
  id: NotificationFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "rentals", label: "Rentals" },
  { id: "chat", label: "Chat" },
  { id: "reviews", label: "Reviews" },
  { id: "system", label: "System" },
  { id: "security", label: "Security" },
];
