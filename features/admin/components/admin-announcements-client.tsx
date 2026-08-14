"use client";

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
  { value: "ALL", label: "Everyone (send to all users)" },
  { value: "BUYERS", label: "Buyers" },
  { value: "SELLERS", label: "Sellers" },
  { value: "ADMINS", label: "Admins" },
  { value: "USER", label: "Specific user" },
];

type AnnouncementFormState = {
  title: string;
  body: string;
  target: AnnouncementView["target"];
  targetUserId: string;
  dismissible: boolean;
  isActive: boolean;
  notifyUsers: boolean;
};

const EMPTY_FORM: AnnouncementFormState = {
  title: "",
  body: "",
  target: "ALL",
  targetUserId: "",
  dismissible: true,
  isActive: true,
  notifyUsers: true,
};

export function AdminAnnouncementsClient({
  announcements,
}: {
  announcements: AnnouncementView[];
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<AnnouncementFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function startEdit(announcement: AnnouncementView) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      body: announcement.body,
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
  }

  async function submit() {
    setSaving(true);
    const payload = {
      title: form.title,
      body: form.body,
      target: form.target,
      targetUserId:
        form.target === "USER" ? form.targetUserId.trim() || null : null,
      dismissible: form.dismissible,
      isActive: form.isActive,
    };

    const res = editingId
      ? await updateAnnouncementAction({
          id: editingId,
          ...payload,
          notifyUsers: form.notifyUsers,
        })
      : await createAnnouncementAction(payload);

    setSaving(false);

    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }

    toast.success(
      editingId
        ? "Announcement updated and users notified."
        : "Announcement sent to users.",
    );
    resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-muted-foreground text-sm">
          Send platform messages to all users or a specific audience. Users see
          them on the home screen and in notifications.
        </p>
      </div>

      <div className="border-border/70 bg-card max-w-xl space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">
          {editingId ? "Edit announcement" : "New announcement"}
        </h2>
        <input
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Title"
          className="border-border w-full rounded-lg border px-3 py-2 text-sm"
        />
        <textarea
          value={form.body}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, body: e.target.value }))
          }
          placeholder="Message"
          className="border-border min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
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
                setForm((prev) => ({ ...prev, notifyUsers: e.target.checked }))
              }
            />
            Notify users again after saving
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save & notify"
                : "Send announcement"}
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

      <ul className="space-y-3">
        {announcements.map((announcement) => (
          <li
            key={announcement.id}
            className="border-border/70 bg-card rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{announcement.title}</p>
                <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                  {announcement.body}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {announcement.target}
                  {announcement.targetUserLabel
                    ? ` · ${announcement.targetUserLabel}`
                    : ""}{" "}
                  · {announcement.isActive ? "Active" : "Inactive"}
                </p>
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
