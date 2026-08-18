"use client";

import { BellRing, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "@/features/admin/actions/settings-actions";
import type { AnnouncementView } from "@/features/admin/types/admin";

const TARGET_OPTIONS: Array<{
  value: AnnouncementView["target"];
  label: string;
}> = [
  { value: "ALL", label: "Everyone (all users)" },
  { value: "BUYERS", label: "Buyers" },
  { value: "SELLERS", label: "Sellers" },
  { value: "ADMINS", label: "Admins" },
  { value: "USER", label: "Specific user" },
];

type AnnouncementFormState = {
  title: string;
  body: string;
  targetUrl: string;
  target: AnnouncementView["target"];
  targetUserId: string;
  dismissible: boolean;
  isActive: boolean;
  notifyUsers: boolean;
};

const EMPTY_FORM: AnnouncementFormState = {
  title: "",
  body: "",
  targetUrl: "/",
  target: "ALL",
  targetUserId: "",
  dismissible: true,
  isActive: true,
  notifyUsers: true,
};

function targetLabel(target: AnnouncementView["target"]): string {
  return (
    TARGET_OPTIONS.find((option) => option.value === target)?.label ?? target
  );
}

function AnnouncementPreview({
  title,
  body,
  targetUrl,
}: {
  title: string;
  body: string;
  targetUrl: string;
}) {
  return (
    <div className="border-border/70 bg-muted/30 space-y-3 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Preview
      </p>
      <div className="border-brand-blue/20 bg-brand-blue-soft/40 rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <span className="bg-brand-blue inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
            <Megaphone className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {title.trim() || "Announcement title"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
              {body.trim() || "Your message will appear here."}
            </p>
          </div>
        </div>
      </div>
      <div className="border-border/60 bg-card flex items-start gap-3 rounded-xl border px-3 py-3">
        <BellRing
          className="text-brand-blue mt-0.5 size-4 shrink-0"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-xs font-medium">Push notification</p>
          <p className="text-muted-foreground text-xs">
            {title.trim() || "Title"} —{" "}
            {(body.trim() || "Message").slice(0, 80)}
            {(body.trim().length || 0) > 80 ? "…" : ""}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Opens: {targetUrl.trim() || "/"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeliveryStats({
  delivery,
}: {
  delivery: NonNullable<AnnouncementView["delivery"]>;
}) {
  return (
    <div className="bg-muted/40 mt-3 grid grid-cols-2 gap-2 rounded-lg p-3 text-xs sm:grid-cols-5">
      <div>
        <p className="text-muted-foreground">Recipients</p>
        <p className="font-semibold">{delivery.recipientCount}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Push tried</p>
        <p className="font-semibold">{delivery.pushAttempted}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Push OK</p>
        <p className="text-brand-green font-semibold">{delivery.pushSuccess}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Push failed</p>
        <p className="font-semibold">{delivery.pushFailed}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Expired removed</p>
        <p className="font-semibold">{delivery.expiredRemoved}</p>
      </div>
    </div>
  );
}

export function AdminAnnouncementsClient({
  announcements,
}: {
  announcements: AnnouncementView[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<AnnouncementFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmChecked, setConfirmChecked] = React.useState(false);

  function startEdit(announcement: AnnouncementView) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
      targetUrl: announcement.targetUrl ?? "/",
      target: announcement.target,
      targetUserId: announcement.targetUserId ?? "",
      dismissible: announcement.dismissible,
      isActive: announcement.isActive,
      notifyUsers: true,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setConfirmOpen(false);
    setConfirmChecked(false);
  }

  function needsAllUsersConfirmation(): boolean {
    const willNotify = editingId
      ? form.notifyUsers && form.isActive
      : form.isActive;
    return willNotify && form.target === "ALL";
  }

  async function submit(confirmedAllUsers = false) {
    if (needsAllUsersConfirmation() && !confirmedAllUsers) {
      setConfirmOpen(true);
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      body: form.body,
      targetUrl: form.targetUrl.trim() || null,
      target: form.target,
      targetUserId:
        form.target === "USER" ? form.targetUserId.trim() || null : null,
      dismissible: form.dismissible,
      isActive: form.isActive,
      confirmAllUsers:
        needsAllUsersConfirmation() || form.target === "ALL" ? true : undefined,
    };

    const res = editingId
      ? await updateAnnouncementAction({
          id: editingId,
          ...payload,
          notifyUsers: form.notifyUsers,
        })
      : await createAnnouncementAction(payload);

    setSaving(false);
    setConfirmOpen(false);
    setConfirmChecked(false);

    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }

    toast.success(
      editingId
        ? "Announcement updated. Users are being notified in the background."
        : "Announcement created. In-app and push delivery started in the background.",
    );
    resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Broadcast announcements</h1>
        <p className="text-muted-foreground text-sm">
          Official SamaanX messages for all users or a specific audience. Users
          receive in-app alerts immediately and Web Push when enabled on their
          devices.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="border-border/70 bg-card space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit announcement" : "New broadcast"}
          </h2>
          <input
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Title — e.g. New feature available on SamaanX!"
            className="border-border w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, body: e.target.value }))
            }
            placeholder="Message — e.g. Scheduled maintenance tonight at 11 PM PKT."
            className="border-border min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            value={form.targetUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, targetUrl: e.target.value }))
            }
            placeholder="Target URL (optional) — e.g. /search or /help"
            className="border-border w-full rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={form.target}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                target: e.target.value as AnnouncementView["target"],
              }))
            }
            className="border-border w-full rounded-lg border px-3 py-2 text-sm"
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {form.target === "USER" ? (
            <input
              value={form.targetUserId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetUserId: e.target.value }))
              }
              placeholder="Target user ID (UUID)"
              className="border-border w-full rounded-lg border px-3 py-2 text-sm"
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Active
          </label>
          {editingId ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.notifyUsers}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    notifyUsers: e.target.checked,
                  }))
                }
              />
              Notify users again after saving
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving
                ? "Sending…"
                : editingId
                  ? "Save & notify"
                  : "Send broadcast"}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={saving}
                onClick={resetForm}
                className="border-border rounded-lg border px-4 py-2 text-sm"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>

        <AnnouncementPreview
          title={form.title}
          body={form.body}
          targetUrl={form.targetUrl}
        />
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="broadcast-confirm-title"
            className="border-border/70 bg-card w-full max-w-md space-y-4 rounded-2xl border p-5 shadow-xl"
          >
            <h3 id="broadcast-confirm-title" className="text-lg font-semibold">
              Broadcast to all users?
            </h3>
            <p className="text-muted-foreground text-sm">
              This sends an in-app notification and Web Push (where enabled) to
              every active SamaanX user. Delivery runs in the background after
              you confirm.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-1"
              />
              <span>
                I understand this is an official broadcast to{" "}
                <strong>all users</strong>.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="border-border rounded-lg border px-4 py-2 text-sm"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmChecked(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmChecked || saving}
                className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => void submit(true)}
              >
                Confirm & send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {announcements.map((announcement) => (
          <li
            key={announcement.id}
            className="border-border/70 bg-card rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{announcement.title}</p>
                <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                  {announcement.body}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {targetLabel(announcement.target)}
                  {announcement.targetUserLabel
                    ? ` · ${announcement.targetUserLabel}`
                    : ""}{" "}
                  · {announcement.isActive ? "Active" : "Inactive"}
                  {announcement.targetUrl
                    ? ` · Opens ${announcement.targetUrl}`
                    : ""}
                </p>
                {announcement.delivery ? (
                  <DeliveryStats delivery={announcement.delivery} />
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Delivery stats appear after the first broadcast run
                    completes.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => startEdit(announcement)}
                className="text-brand-blue hover:bg-brand-blue-soft rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
