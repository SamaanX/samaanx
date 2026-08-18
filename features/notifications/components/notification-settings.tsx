"use client";

import { Bell, Mail, MessageSquare, Shield, Sparkles } from "lucide-react";
import * as React from "react";

import {
  getNotificationPreferencesAction,
  sendTestEmailAction,
  sendTestPushAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions/notification-preferences";
import {
  removeAllPushSubscriptionsAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/features/notifications/actions/push-subscription";
import {
  getCurrentPushEndpoint,
  getPushCapability,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/features/notifications/lib/subscribe-push";
import type { NotificationPreferencesView } from "@/features/notifications/services/preferences";
import { FormMessage } from "@/features/profile/components/form-message";
import { LoadingButton } from "@/features/profile/components/loading-button";
import { cn } from "@/lib/utils";

type ToggleRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-brand-blue-soft text-brand-blue mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-visible:ring-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
          checked ? "bg-brand-green" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

function pushStatusLabel(permission: NotificationPermission | "unsupported") {
  switch (permission) {
    case "granted":
      return "Allowed in this browser";
    case "denied":
      return "Blocked — enable in browser site settings";
    case "default":
      return "Not requested yet";
    default:
      return "Not supported on this device/browser";
  }
}

export function NotificationSettings() {
  const [prefs, setPrefs] = React.useState<NotificationPreferencesView | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [testingEmail, setTestingEmail] = React.useState(false);
  const [testingPush, setTestingPush] = React.useState(false);
  const [pushPermission, setPushPermission] = React.useState<
    NotificationPermission | "unsupported"
  >("default");
  const [pushSupported, setPushSupported] = React.useState(false);

  React.useEffect(() => {
    const capability = getPushCapability();
    setPushSupported(capability.supported && capability.vapidConfigured);
    setPushPermission(capability.permission);

    void getNotificationPreferencesAction().then((data) => {
      setPrefs(data);
      setLoading(false);
    });
  }, []);

  /** Re-save browser subscription if permission granted but DB row missing. */
  React.useEffect(() => {
    if (loading || !pushSupported || pushPermission !== "granted") return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const json = subscription?.toJSON();
        if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent.slice(0, 512),
        });
      } catch {
        /* graceful — user can use toggle */
      }
    })();
  }, [loading, pushSupported, pushPermission]);

  async function update(
    patch: Partial<NotificationPreferencesView>,
  ): Promise<void> {
    if (!prefs) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const result = await updateNotificationPreferencesAction(patch);
    setSaving(false);
    if (!result.ok) {
      setError("Could not save notification settings.");
      setPrefs(prefs);
      return;
    }
    setMessage("Notification settings saved.");
  }

  async function togglePush(enabled: boolean): Promise<void> {
    setError(null);
    setMessage(null);
    setSaving(true);

    if (enabled) {
      const capability = getPushCapability();
      if (!capability.supported || !capability.vapidConfigured) {
        setSaving(false);
        setError("Push notifications are not available on this browser.");
        return;
      }

      const result = await subscribeToPushNotifications();
      setPushPermission(Notification.permission);

      if (!result.ok) {
        setSaving(false);
        if (result.reason === "denied") {
          setError(
            "Browser blocked notifications. Enable them in your browser site settings for SamaanX.",
          );
        } else if (
          result.reason === "unsupported" ||
          result.reason === "no_vapid"
        ) {
          setError("Push notifications are not available right now.");
        } else {
          setError("Could not enable push notifications.");
        }
        return;
      }

      const saved = await savePushSubscriptionAction({
        endpoint: result.endpoint,
        keys: result.keys,
        userAgent: navigator.userAgent.slice(0, 512),
      });

      if (!saved.ok) {
        setSaving(false);
        setError("Could not save push subscription.");
        return;
      }

      await update({ notifyPushEnabled: true });
      setMessage("Browser push enabled for this device.");
      setSaving(false);
      return;
    }

    const endpoint = await getCurrentPushEndpoint();
    if (endpoint) {
      await removePushSubscriptionAction(endpoint);
    }
    await unsubscribeFromPushNotifications();
    await removeAllPushSubscriptionsAction();
    setPrefs((current) =>
      current ? { ...current, notifyPushEnabled: false } : current,
    );
    setMessage("Browser push disabled on this device.");
    setSaving(false);
  }

  async function sendTestEmail(): Promise<void> {
    setError(null);
    setMessage(null);
    setTestingEmail(true);
    const result = await sendTestEmailAction();
    setTestingEmail(false);
    if (!result.ok) {
      setError(result.error ?? "Test email failed.");
      return;
    }
    setMessage(
      result.to
        ? `Test email sent to ${result.to}. Check inbox and Resend dashboard.`
        : "Test email sent.",
    );
  }

  async function sendTestPush(): Promise<void> {
    setError(null);
    setMessage(null);
    setTestingPush(true);

    if (Notification.permission === "granted" && pushSupported) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const json = subscription?.toJSON();
        if (json?.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await savePushSubscriptionAction({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            userAgent: navigator.userAgent.slice(0, 512),
          });
        }
      } catch {
        /* continue to test action */
      }
    }

    const result = await sendTestPushAction();
    setTestingPush(false);
    if (!result.ok) {
      setError(
        result.error ??
          "Test push failed. Turn Browser push OFF, then ON again, allow permission, and retry.",
      );
      return;
    }
    setMessage("Test push sent — check your device notification tray.");
  }

  if (loading || !prefs) {
    return (
      <section
        id="notifications"
        className="border-border/70 bg-card scroll-mt-28 overflow-hidden rounded-[1.35rem] border shadow-[var(--rp-shadow-xs)]"
      >
        <div className="border-border/60 border-b px-4 py-4 sm:px-5">
          <div className="bg-muted h-6 w-40 animate-pulse rounded" />
          <div className="bg-muted mt-2 h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted/70 h-16 animate-pulse rounded-xl"
            />
          ))}
        </div>
      </section>
    );
  }

  const pushBlocked = pushPermission === "denied";

  return (
    <section
      id="notifications"
      aria-labelledby="notification-settings-heading"
      className="border-border/70 bg-card scroll-mt-28 overflow-hidden rounded-[1.35rem] border shadow-[var(--rp-shadow-xs)]"
    >
      <div className="border-border/60 border-b px-4 py-4 sm:px-5">
        <h2
          id="notification-settings-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Notification settings
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Control email, push, and in-app alerts. Security alerts always stay
          on.
        </p>
      </div>

      <div className="divide-border/60 divide-y">
        <ToggleRow
          icon={<Mail className="size-4" aria-hidden />}
          title="Email notifications"
          description="Rental updates and account emails."
          checked={prefs.notifyEmailEnabled}
          onChange={(checked) => void update({ notifyEmailEnabled: checked })}
        />
        <div>
          <ToggleRow
            icon={<Bell className="size-4" aria-hidden />}
            title="Browser push"
            description={
              pushSupported
                ? "Instant alerts when SamaanX is in the background."
                : "Requires a supported browser and installed PWA on mobile."
            }
            checked={prefs.notifyPushEnabled}
            disabled={!pushSupported || pushBlocked || saving}
            onChange={(checked) => void togglePush(checked)}
          />
          {pushSupported ? (
            <p className="text-muted-foreground px-4 pb-3 text-xs sm:px-5">
              Browser permission: {pushStatusLabel(pushPermission)}
            </p>
          ) : null}
        </div>
        <ToggleRow
          icon={<MessageSquare className="size-4" aria-hidden />}
          title="Chat notifications"
          description="New message alerts and unread reminders."
          checked={prefs.notifyChatEnabled}
          onChange={(checked) => void update({ notifyChatEnabled: checked })}
        />
        <ToggleRow
          icon={<Sparkles className="size-4" aria-hidden />}
          title="Rental updates"
          description="Requests, approvals, handover, and returns."
          checked={prefs.notifyRentalEnabled}
          onChange={(checked) => void update({ notifyRentalEnabled: checked })}
        />
        <ToggleRow
          icon={<Mail className="size-4" aria-hidden />}
          title="Marketing emails"
          description="Tips, product news, and seller growth ideas."
          checked={prefs.notifyMarketingEnabled}
          onChange={(checked) =>
            void update({ notifyMarketingEnabled: checked })
          }
        />
        <ToggleRow
          icon={<Mail className="size-4" aria-hidden />}
          title="Weekly digest"
          description="Weekly summary of activity and recommendations."
          checked={prefs.notifyWeeklyDigestEnabled}
          onChange={(checked) =>
            void update({ notifyWeeklyDigestEnabled: checked })
          }
        />
        <ToggleRow
          icon={<Shield className="size-4" aria-hidden />}
          title="Security alerts"
          description="Always enabled for sign-in and account changes."
          checked
          disabled
          onChange={() => undefined}
        />
      </div>

      <div className="border-border/60 space-y-2 border-t px-4 py-4 sm:px-5">
        <LoadingButton
          type="button"
          loading={testingEmail}
          disabled={saving}
          className="w-full"
          onClick={() => void sendTestEmail()}
        >
          Send test email
        </LoadingButton>
        {pushSupported ? (
          <LoadingButton
            type="button"
            variant="outline"
            loading={testingPush}
            disabled={saving || !prefs.notifyPushEnabled || pushBlocked}
            className="w-full"
            onClick={() => void sendTestPush()}
          >
            Send test push
          </LoadingButton>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Test notifications go to your account only. On iOS, push requires the
          installed PWA (iOS 16.4+) with permission granted.
        </p>
        <FormMessage message={error} />
        {message ? (
          <p className="text-brand-green text-sm font-medium">{message}</p>
        ) : null}
        {saving ? (
          <LoadingButton type="button" loading className="w-full">
            Saving…
          </LoadingButton>
        ) : null}
      </div>
    </section>
  );
}
