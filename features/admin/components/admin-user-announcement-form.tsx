"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { createAnnouncementAction } from "@/features/admin/actions/settings-actions";

type AdminUserAnnouncementFormProps = {
  userId: string;
  userLabel: string;
};

export function AdminUserAnnouncementForm({
  userId,
  userLabel,
}: AdminUserAnnouncementFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function send() {
    setSaving(true);
    const res = await createAnnouncementAction({
      title,
      body,
      target: "USER",
      targetUserId: userId,
      dismissible: true,
      isActive: true,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }

    toast.success(`Announcement sent to ${userLabel}.`);
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <div className="border-border/70 bg-card space-y-3 rounded-xl border p-4">
      <div>
        <h2 className="text-lg font-semibold">Send announcement</h2>
        <p className="text-muted-foreground text-sm">
          Notify {userLabel} on the home screen and in their notification inbox.
        </p>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="border-border w-full rounded-lg border px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        className="border-border min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void send()}
        className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
      >
        {saving ? "Sending…" : "Send to this user"}
      </button>
    </div>
  );
}
