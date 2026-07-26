"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  getNotificationsSnapshotAction,
  type NotificationsSnapshot,
} from "@/features/notifications/actions/get-notifications-snapshot";
import { showNotificationToast } from "@/features/notifications/services/notification-toast";
import {
  type NotificationView,
  resolveNotificationCta,
  resolveNotificationHref,
} from "@/features/notifications/types/notification";
import { invalidateRentalSurfaces } from "@/features/rentals/lib/invalidate-rental-surfaces";
import { queryKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";

type UseHeaderNotificationsOptions = {
  userId: string;
  initialData: NotificationsSnapshot;
};

/**
 * Header notifications: trust RSC initialData; update via Realtime + toast.
 * No polling — badge/list update from postgres_changes only.
 */
export function useHeaderNotifications({
  userId,
  initialData,
}: UseHeaderNotificationsOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const initialUpdatedAtRef = React.useRef(Date.now());
  const seenInsertIdsRef = React.useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: queryKeys.notifications.header(),
    queryFn: () => getNotificationsSnapshotAction(),
    initialData,
    initialDataUpdatedAt: initialUpdatedAtRef.current,
    // Header RSC + postgres_changes keep this fresh; no mount refetch tax.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  React.useEffect(() => {
    for (const item of initialData.recent) {
      seenInsertIdsRef.current.add(item.id);
    }
  }, [initialData.recent]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.setQueryData<NotificationsSnapshot>(
            queryKeys.notifications.header(),
            (prev) => {
              const current = prev ?? initialData;

              if (payload.eventType === "INSERT") {
                const row = payload.new as Record<string, unknown>;
                const view = rowToView(row);
                if (!view) return current;

                if (!seenInsertIdsRef.current.has(view.id)) {
                  seenInsertIdsRef.current.add(view.id);
                  // Chat toasts come from broadcast (faster). Skip duplicate NEW_MESSAGE.
                  if (view.type !== "NEW_MESSAGE") {
                    showNotificationToast(view, (href) => router.push(href));
                  }
                }

                if (shouldInvalidateRentals(view.type)) {
                  invalidateRentalSurfaces(queryClient);
                }

                void queryClient.invalidateQueries({
                  queryKey: queryKeys.notifications.inbox(),
                  refetchType: "active",
                });

                const recent = [
                  view,
                  ...current.recent.filter((item) => item.id !== view.id),
                ].slice(0, 8);
                const unreadDelta = view.readAt == null ? 1 : 0;
                return {
                  unreadCount: current.unreadCount + unreadDelta,
                  recent,
                };
              }

              if (payload.eventType === "UPDATE") {
                const row = payload.new as Record<string, unknown>;
                const oldRow = payload.old as
                  Record<string, unknown> | undefined;
                const view = rowToView(row);
                if (!view) return current;

                void queryClient.invalidateQueries({
                  queryKey: queryKeys.notifications.inbox(),
                  refetchType: "active",
                });

                const recent = current.recent.map((item) =>
                  item.id === view.id ? view : item,
                );
                const wasUnread =
                  oldRow &&
                  (oldRow.read_at == null || oldRow.read_at === undefined);
                const isUnread = view.readAt == null;
                let unreadCount = current.unreadCount;
                if (wasUnread && !isUnread) {
                  unreadCount = Math.max(0, unreadCount - 1);
                } else if (!wasUnread && isUnread) {
                  unreadCount += 1;
                }
                return { unreadCount, recent };
              }

              if (payload.eventType === "DELETE") {
                const oldRow = payload.old as Record<string, unknown>;
                const id = typeof oldRow.id === "string" ? oldRow.id : null;
                if (!id) return current;
                const removed = current.recent.find((item) => item.id === id);
                return {
                  unreadCount:
                    removed && !removed.readAt
                      ? Math.max(0, current.unreadCount - 1)
                      : current.unreadCount,
                  recent: current.recent.filter((item) => item.id !== id),
                };
              }

              return current;
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, initialData, router]);

  return {
    unreadCount: query.data?.unreadCount ?? 0,
    recent: query.data?.recent ?? [],
    setOptimistic: (next: NotificationsSnapshot) => {
      queryClient.setQueryData(queryKeys.notifications.header(), next);
    },
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.header(),
      }),
  };
}

function shouldInvalidateRentals(type: NotificationView["type"]): boolean {
  return (
    type.startsWith("RENTAL_") ||
    type === "VERIFICATION_READY" ||
    type === "HANDOVER_COMPLETED" ||
    type === "RETURN_COMPLETED" ||
    type === "REVIEW_REMINDER"
  );
}

function rowToView(row: Record<string, unknown>): NotificationView | null {
  if (typeof row.id !== "string" || typeof row.type !== "string") {
    return null;
  }
  const title = typeof row.title === "string" ? row.title : "";
  const type = row.type as NotificationView["type"];
  const readAt =
    row.read_at instanceof Date
      ? row.read_at.toISOString()
      : typeof row.read_at === "string"
        ? row.read_at
        : null;
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString();
  const rentalId = typeof row.rental_id === "string" ? row.rental_id : null;
  const listingId = typeof row.listing_id === "string" ? row.listing_id : null;
  const payload = row.payload ?? null;

  return {
    id: row.id,
    type,
    title,
    body: typeof row.body === "string" ? row.body : "",
    rentalId,
    listingId,
    payload,
    readAt,
    createdAt,
    href: resolveNotificationHref(type, title, { rentalId, payload }),
    ctaLabel: resolveNotificationCta(type, title, { payload }),
  };
}
