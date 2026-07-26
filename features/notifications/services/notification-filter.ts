import type { NotificationType } from "@prisma/client";

export type NotificationFilter =
  "all" | "unread" | "rentals" | "chat" | "system" | "security" | "reviews";

const RENTAL_TYPES: NotificationType[] = [
  "RENTAL_REQUESTED",
  "RENTAL_APPROVED",
  "RENTAL_REJECTED",
  "RENTAL_CANCELLED",
  "VERIFICATION_READY",
  "HANDOVER_COMPLETED",
  "RETURN_COMPLETED",
  "REVIEW_REMINDER",
];

export function filterNotificationTypes(
  filter: NotificationFilter,
): NotificationType[] | null {
  switch (filter) {
    case "all":
    case "unread":
      return null;
    case "rentals":
      return RENTAL_TYPES;
    case "chat":
      return ["NEW_MESSAGE"];
    case "system":
      return ["SYSTEM"];
    case "security":
      return ["SECURITY_ALERT", "ACCOUNT_CHANGE"];
    case "reviews":
      return ["REVIEW_REMINDER"];
    default:
      return null;
  }
}

export function notificationMatchesFilter(
  type: NotificationType,
  filter: NotificationFilter,
  readAt: string | null,
): boolean {
  if (filter === "unread") return readAt == null;
  const types = filterNotificationTypes(filter);
  if (!types) return true;
  return types.includes(type);
}
