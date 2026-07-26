"use client";

import { BellRing } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  dismissPushPromptAction,
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions/notification-preferences";
import { savePushSubscriptionAction } from "@/features/notifications/actions/push-subscription";
import { getVapidPublicKey } from "@/lib/push/public";
import { cn } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushEnableBanner({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const vapidKey = getVapidPublicKey();

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !vapidKey
      ) {
        return;
      }
      if (Notification.permission === "granted") return;
      const prefs = await getNotificationPreferencesAction();
      if (cancelled || !prefs) return;
      if (prefs.pushPromptDismissedAt) return;
      if (Notification.permission === "denied") return;
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  if (!visible || !vapidKey) return null;

  async function enablePush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          await dismissPushPromptAction();
          setVisible(false);
        }
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if (!vapidKey) return;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      await updateNotificationPreferencesAction({ notifyPushEnabled: true });
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
