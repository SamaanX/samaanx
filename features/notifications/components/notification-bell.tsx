"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  markNotificationReadAction,
  markNotificationsReadAction,
} from "@/features/notifications/actions/mark-notifications-read";
import type { NotificationView } from "@/features/notifications/types/notification";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  unreadCount: number;
  recent: NotificationView[];
  onOptimisticChange?: (next: {
    unreadCount: number;
    recent: NotificationView[];
  }) => void;
};

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat("en-PK", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function NotificationBell({
  unreadCount: initialUnread,
  recent: initialRecent,
  onOptimisticChange,
}: NotificationBellProps) {
  const isDesktop = useIsDesktop();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(initialUnread);
  const [items, setItems] = React.useState(initialRecent);
  const [markingAll, startMarkAll] = React.useTransition();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setUnreadCount(initialUnread);
    setItems(initialRecent);
  }, [initialUnread, initialRecent]);

  function publishOptimistic(
    nextUnread: number,
    nextItems: NotificationView[],
  ) {
    setUnreadCount(nextUnread);
    setItems(nextItems);
    onOptimisticChange?.({ unreadCount: nextUnread, recent: nextItems });
  }

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    if (!isDesktop) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isDesktop]);

  function clearUnreadLocally() {
    const nextItems = items.map((item) => ({
      ...item,
      readAt: item.readAt ?? new Date().toISOString(),
    }));
    publishOptimistic(0, nextItems);
  }

  function handleMarkAll() {
    if (unreadCount === 0 || markingAll) return;
    clearUnreadLocally();
    startMarkAll(async () => {
      await markNotificationsReadAction();
    });
  }

  async function handleItemClick(item: NotificationView) {
    setOpen(false);
    if (!item.readAt) {
      const nextItems = items.map((row) =>
        row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
      );
      publishOptimistic(Math.max(0, unreadCount - 1), nextItems);
      void markNotificationReadAction(item.id);
    }
  }

  const badgeLabel =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  const panelBody = (
    <>
      <div className="border-border/60 from-brand-blue-soft/80 via-card to-brand-green-soft/50 flex items-center justify-between gap-2 border-b bg-gradient-to-r px-4 py-3">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold tracking-tight">
            Notifications
          </p>
          <p className="text-muted-foreground text-xs">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAll}
            className="text-brand-blue gap-1 px-2"
          >
            {markingAll ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="size-3.5" aria-hidden />
            )}
            <span className="hidden min-[380px]:inline sm:inline">
              Mark all{isDesktop ? " read" : ""}
            </span>
          </Button>
          {!isDesktop ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Close notifications"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="bg-brand-blue-soft text-brand-blue mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl">
            <Bell className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Rental updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="max-h-[min(24rem,52dvh)] overflow-y-auto overscroll-contain py-1 sm:max-h-[22rem]">
          {items.map((item) => {
            const unread = !item.readAt;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => void handleItemClick(item)}
                  className={cn(
                    "active:bg-brand-blue-soft/60 focus-visible:bg-brand-blue-soft/50 sm:hover:bg-brand-blue-soft/50 block px-4 py-3.5 transition-colors focus-visible:outline-none sm:py-3",
                    unread && "bg-brand-blue-soft/25",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        unread
                          ? "bg-brand-green ring-brand-green/20 ring-4"
                          : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-foreground min-w-0 flex-1 text-sm tracking-tight break-words",
                            unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title}
                        </p>
                        <time
                          dateTime={item.createdAt}
                          className="text-muted-foreground shrink-0 pt-0.5 text-[0.7rem]"
                        >
                          {formatRelative(item.createdAt)}
                        </time>
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                        {item.body}
                      </p>
                      <p className="text-brand-blue mt-1.5 text-xs font-semibold">
                        {item.ctaLabel} →
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-border/60 bg-muted/40 border-t px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="text-brand-blue hover:bg-brand-blue-soft focus-visible:ring-ring flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:h-9"
        >
          View all notifications
        </Link>
      </div>
    </>
  );

  const desktopPanel = (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className="border-border/70 bg-card absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-lg)]"
    >
      {panelBody}
    </motion.div>
  );

  const mobileSheet = mounted
    ? createPortal(
        <AnimatePresence>
          {open && !isDesktop ? (
            <motion.button
              key="notification-backdrop"
              type="button"
              aria-label="Dismiss notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="bg-foreground/35 fixed inset-0 z-[60] backdrop-blur-[2px] sm:hidden"
              onClick={() => setOpen(false)}
            />
          ) : null}
          {open && !isDesktop ? (
            <motion.div
              key="notification-sheet"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className="border-border/70 bg-card fixed inset-x-0 bottom-0 z-[61] flex max-h-[min(85dvh,40rem)] flex-col overflow-hidden rounded-t-3xl border shadow-[var(--rp-shadow-lg)] sm:hidden"
            >
              <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
                <span className="bg-border h-1 w-10 rounded-full" />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">{panelBody}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-xl transition-all duration-200",
          "text-brand-blue hover:bg-brand-blue-soft",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          open && "bg-brand-blue-soft shadow-[var(--rp-shadow-xs)]",
        )}
      >
        <span
          className={cn(
            "bg-brand-gradient absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200",
            unreadCount > 0 && !open && "opacity-[0.08]",
          )}
          aria-hidden
        />
        <Bell
          className={cn(
            "relative size-5 transition-transform duration-200",
            unreadCount > 0 && "animate-bell-nudge",
          )}
          aria-hidden
        />
        <AnimatePresence>
          {badgeLabel ? (
            <motion.span
              key="badge"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="bg-brand-green absolute top-1 right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold text-white shadow-[0_0_0_2px_var(--background)]"
            >
              {badgeLabel}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && isDesktop ? desktopPanel : null}
      </AnimatePresence>
      {mobileSheet}
    </div>
  );
}
