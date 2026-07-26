import { toast } from "sonner";

import type { NotificationView } from "@/features/notifications/types/notification";

/**
 * Shows an actionable toast for a newly inserted in-app notification.
 */
export function showNotificationToast(
  notification: NotificationView,
  navigate: (href: string) => void,
): void {
  if (notification.readAt) return;

  toast(notification.title, {
    id: `notification-${notification.id}`,
    description: notification.body,
    duration: 6500,
    action: {
      label: notification.ctaLabel || "View",
      onClick: () => navigate(notification.href),
    },
  });
}
