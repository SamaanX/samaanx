"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { deleteNotificationAction } from "@/features/notifications/actions/delete-notification";
import { markNotificationReadAction } from "@/features/notifications/actions/mark-notifications-read";
import { getNotificationCategoryLabel } from "@/features/notifications/lib/inbox-utils";
import type { NotificationView } from "@/features/notifications/types/notification";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type NotificationListProps = {
  items: NotificationView[];
  grouped?: Array<{ label: string; items: NotificationView[] }>;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function NotificationList({ items, grouped }: NotificationListProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  function patchCaches(
    updater: (rows: NotificationView[]) => NotificationView[],
  ) {
    queryClient.setQueryData<NotificationView[]>(
      queryKeys.notifications.inbox(),
      (prev) => updater(prev ?? items),
    );
    queryClient.setQueryData(queryKeys.notifications.header(), (prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const header = prev as {
        unreadCount: number;
        recent: NotificationView[];
      };
      const nextRecent = updater(header.recent);
      const unreadCount = nextRecent.filter((r) => !r.readAt).length;
      return { unreadCount, recent: nextRecent };
    });
  }

  async function handleClick(item: NotificationView) {
    if (item.readAt) return;

    patchCaches((rows) =>
      rows.map((row) =>
        row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
      ),
    );

    const result = await markNotificationReadAction(item.id);
    if (result.ok) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
        refetchType: "none",
      });
    }
  }

  async function handleDelete(event: React.MouseEvent, item: NotificationView) {
    event.preventDefault();
    event.stopPropagation();
    if (deletingId) return;
    setDeletingId(item.id);
    patchCaches((rows) => rows.filter((row) => row.id !== item.id));
    await deleteNotificationAction(item.id);
    setDeletingId(null);
  }

  if (items.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border border-dashed px-6 py-16 text-center">
        <p className="text-lg font-semibold tracking-tight">No notifications</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Rental requests and updates will show up here.
        </p>
      </div>
    );
  }

  const sections = grouped ?? [{ label: "", items }];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.label || "all"} className="space-y-2">
          {section.label ? (
            <h2 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
              {section.label}
            </h2>
          ) : null}
          <ul className="space-y-2">
            {section.items.map((item) => {
              const unread = !item.readAt;
              const category = getNotificationCategoryLabel(item.type);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => void handleClick(item)}
                    className={cn(
                      "group hover:border-brand-blue/30 hover:bg-brand-blue-soft/40 focus-visible:ring-ring relative block rounded-2xl border px-4 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      unread
                        ? "border-brand-blue/25 bg-brand-blue-soft/30"
                        : "border-border/80 bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase">
                            {category}
                          </span>
                          {unread ? (
                            <span className="bg-brand-green inline-block size-1.5 rounded-full" />
                          ) : null}
                        </div>
                        <p className="text-foreground font-semibold tracking-tight">
                          {item.title}
                        </p>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.body}
                        </p>
                        <p className="text-brand-blue text-xs font-semibold">
                          {item.ctaLabel} →
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <time
                          dateTime={item.createdAt}
                          className="text-muted-foreground text-xs"
                        >
                          {formatWhen(item.createdAt)}
                        </time>
                        <button
                          type="button"
                          aria-label="Delete notification"
                          disabled={deletingId === item.id}
                          onClick={(event) => void handleDelete(event, item)}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
