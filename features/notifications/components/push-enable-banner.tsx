"use client";

import { BellRing } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { dismissPushPromptAction } from "@/features/notifications/actions/notification-preferences";
import {
  enablePushForCurrentDevice,
  getPushCapability,
} from "@/features/notifications/lib/subscribe-push";
import { cn } from "@/lib/utils";

export function PushEnableBanner({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const capability = getPushCapability();
    if (
      !capability.supported ||
      !capability.vapidConfigured ||
      capability.permission === "granted" ||
      capability.permission === "denied"
    ) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const { getNotificationPreferencesAction } =
        await import("@/features/notifications/actions/notification-preferences");
      const prefs = await getNotificationPreferencesAction();
      if (cancelled || !prefs || prefs.pushPromptDismissedAt) return;
      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function enablePush() {
    setLoading(true);
    try {
      const result = await enablePushForCurrentDevice();
      if (!result.ok) {
        if (result.reason === "denied") {
          await dismissPushPromptAction();
          setVisible(false);
        }
        return;
      }
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  async function dismiss() {
    await dismissPushPromptAction();
    setVisible(false);
  }

  return (
    <div
      className={cn(
        "border-brand-blue/20 bg-brand-blue-soft/40 flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-brand-blue inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">
            Enable browser notifications
          </p>
          <p className="text-muted-foreground text-xs">
            Get instant alerts for rental requests, approvals, and messages —
            even when SamaanX is in the background.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => void dismiss()}
        >
          Not now
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          disabled={loading}
          onClick={() => void enablePush()}
        >
          {loading ? "Enabling…" : "Enable"}
        </Button>
      </div>
    </div>
  );
}
