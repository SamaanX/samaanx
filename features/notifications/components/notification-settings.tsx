"use client";

import { Bell, Mail, MessageSquare, Shield, Sparkles } from "lucide-react";
import * as React from "react";

import {
  getNotificationPreferencesAction,
  sendTestEmailAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/actions/notification-preferences";
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

export function NotificationSettings() {
  const [prefs, setPrefs] = React.useState<NotificationPreferencesView | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [testingEmail, setTestingEmail] = React.useState(false);

  React.useEffect(() => {
    void getNotificationPreferencesAction().then((data) => {
      setPrefs(data);
      setLoading(false);
    });
  }, []);

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
        <ToggleRow
          icon={<Bell className="size-4" aria-hidden />}
          title="Browser push"
          description="Instant alerts when SamaanX is in the background."
          checked={prefs.notifyPushEnabled}
          onChange={(checked) => void update({ notifyPushEnabled: checked })}
        />
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
        <p className="text-muted-foreground text-xs">
          Sends to your SamaanX account email (not EMAIL_FROM). Resend sandbox
          only delivers to the email you used to sign up for Resend.
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
