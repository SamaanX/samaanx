"use client";

import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useHeaderNotifications } from "@/features/notifications/hooks/use-header-notifications";
import type { NotificationView } from "@/features/notifications/types/notification";

type HeaderNotificationsClientProps = {
  userId: string;
  unreadCount: number;
  recent: NotificationView[];
};

export function HeaderNotificationsClient({
  userId,
  unreadCount,
  recent,
}: HeaderNotificationsClientProps) {
  const live = useHeaderNotifications({
    userId,
    initialData: { unreadCount, recent },
  });

  return (
    <NotificationBell
      unreadCount={live.unreadCount}
      recent={live.recent}
      onOptimisticChange={live.setOptimistic}
    />
  );
}
