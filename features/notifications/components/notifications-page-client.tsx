"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { getNotificationsInboxAction } from "@/features/notifications/actions/get-notifications-inbox";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import { NotificationFilters } from "@/features/notifications/components/notification-filters";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { PushEnableBanner } from "@/features/notifications/components/push-enable-banner";
import {
  filterNotifications,
  groupNotificationsByDate,
} from "@/features/notifications/lib/inbox-utils";
import type { NotificationFilter } from "@/features/notifications/services/preferences";
import type { NotificationView } from "@/features/notifications/types/notification";
import { queryKeys } from "@/lib/query-keys";

type NotificationsPageClientProps = {
  initialItems: NotificationView[];
};

export function NotificationsPageClient({
  initialItems,
}: NotificationsPageClientProps) {
  const initialUpdatedAtRef = React.useRef(Date.now());
  const [filter, setFilter] = React.useState<NotificationFilter>("all");

  const query = useQuery({
    queryKey: queryKeys.notifications.inbox(),
    queryFn: () => getNotificationsInboxAction(),
    initialData: initialItems,
    initialDataUpdatedAt: initialUpdatedAtRef.current,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const items = query.data ?? initialItems;
  const filtered = React.useMemo(
    () => filterNotifications(items, filter),
    [items, filter],
  );
  const grouped = React.useMemo(
    () => groupNotificationsByDate(filtered),
    [filtered],
  );

  const unreadCount = items.reduce(
    (count, item) => count + (item.readAt ? 0 : 1),
    0,
  );

  const filterCounts = React.useMemo(() => {
    const counts: Partial<Record<NotificationFilter, number>> = {
      unread: unreadCount,
    };
    for (const option of [
      "rentals",
      "chat",
      "reviews",
      "system",
      "security",
    ] as NotificationFilter[]) {
      counts[option] = filterNotifications(items, option).length;
    }
    return counts;
  }, [items, unreadCount]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? `${unreadCount} unread · rental requests, approvals, and updates`
              : "Rental requests, approvals, and account updates."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <MarkAllReadButton disabled={unreadCount === 0} />
        ) : null}
      </div>

      <div className="mb-4 space-y-3">
        <PushEnableBanner />
        <NotificationFilters
          value={filter}
          onChange={setFilter}
          counts={filterCounts}
        />
      </div>

      <NotificationList items={filtered} grouped={grouped} />
    </>
  );
}
