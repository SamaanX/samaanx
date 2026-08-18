"use client";

import { BellRing, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { peekWelcomePending } from "@/features/auth/lib/welcome-session";
import {
  dismissPushPromptAction,
  getNotificationPreferencesAction,
} from "@/features/notifications/actions/notification-preferences";
import {
  consumePushPromptPending,
  markPushPromptPending,
  peekPushPromptPending,
} from "@/features/notifications/lib/push-session";
import {
  enablePushForCurrentDevice,
  getCurrentPushEndpoint,
  getPushCapability,
  syncPushSubscriptionToServer,
} from "@/features/notifications/lib/subscribe-push";
import { cn } from "@/lib/utils";

type AutoPushPromptProps = {
  userId: string | null;
};

function waitUntilWelcomeDone(): Promise<void> {
  if (!peekWelcomePending()) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (!peekWelcomePending()) {
        window.clearInterval(timer);
        resolve();
      }
    }, 400);
  });
}

/**
 * After login, prompts for notification permission (browser requires one tap).
 * If permission was already granted, silently syncs subscription.
 */
export function AutoPushPrompt({ userId }: AutoPushPromptProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let openTimer: number | undefined;

    void (async () => {
      const capability = getPushCapability();
      if (!capability.supported || !capability.vapidConfigured) return;

      if (Notification.permission === "granted") {
        await syncPushSubscriptionToServer();
        return;
      }

      if (Notification.permission === "denied") return;

      const prefs = await getNotificationPreferencesAction();
      if (cancelled || prefs?.pushPromptDismissedAt) return;

      const existingEndpoint = await getCurrentPushEndpoint();
      if (existingEndpoint) {
        await syncPushSubscriptionToServer();
        return;
      }

      const justLoggedIn =
        consumePushPromptPending() || peekPushPromptPending();

      await waitUntilWelcomeDone();
      if (cancelled) return;

      openTimer = window.setTimeout(
        () => {
          if (!cancelled) setOpen(true);
        },
        justLoggedIn ? 600 : 1800,
      );
    })();

    return () => {
      cancelled = true;
      if (openTimer) window.clearTimeout(openTimer);
    };
  }, [userId]);

  async function enable() {
    setLoading(true);
    const result = await enablePushForCurrentDevice();
    setLoading(false);
    if (result.ok) {
      setOpen(false);
      return;
    }
    if (result.reason === "denied") {
      await dismissPushPromptAction();
      setOpen(false);
    }
  }

  async function dismiss() {
    await dismissPushPromptAction();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
      role="dialog"
      aria-labelledby="auto-push-title"
      aria-modal="true"
    >
      <div
        className={cn(
          "border-border/80 bg-card mx-auto flex max-w-lg flex-col gap-4 rounded-2xl border p-4 shadow-[var(--rp-shadow-lg)] sm:p-5",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="bg-brand-blue inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white">
            <BellRing className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p
              id="auto-push-title"
              className="text-foreground text-sm font-semibold"
            >
              Enable notifications?
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Get instant alerts for rental requests, messages, and updates —
              even when SamaanX is closed. One tap to allow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="text-muted-foreground hover:bg-muted inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            disabled={loading}
            onClick={() => void dismiss()}
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 rounded-xl"
            disabled={loading}
            onClick={() => void enable()}
          >
            {loading ? "Enabling…" : "Allow notifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Reads ?push=1 from OAuth redirect and sets session flag. */
export function PushPromptUrlHydrator() {
  React.useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("push") !== "1") return;

    markPushPromptPending();

    params.delete("push");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
  }, []);

  return null;
}
