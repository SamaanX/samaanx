"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { updatePlatformSettingsAction } from "@/features/admin/actions/settings-actions";
import type { PlatformSettingsView } from "@/features/admin/types/admin";

export function AdminSettingsClient({
  settings,
  canEdit,
}: {
  settings: PlatformSettingsView;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(settings);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    const res = await updatePlatformSettingsAction(form);
    setSaving(false);
    if (!res.ok) toast.error(res.error.message);
    else {
      toast.success("Settings saved.");
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">System settings</h1>
        <p className="text-muted-foreground text-sm">
          {canEdit ? "Super admin configuration" : "Read-only for admins"}
        </p>
      </div>
      <div className="border-border/70 bg-card space-y-3 rounded-xl border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            disabled={!canEdit}
            onChange={(e) =>
              setForm({ ...form, maintenanceMode: e.target.checked })
            }
          />
          Maintenance mode
        </label>
        <label className="block text-sm">
          Max active listings per seller
          <input
            type="number"
            disabled={!canEdit}
            value={form.maxActiveListingsPerSeller}
            onChange={(e) =>
              setForm({
                ...form,
                maxActiveListingsPerSeller: Number(e.target.value),
              })
            }
            className="border-border mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Max rental days
          <input
            type="number"
            disabled={!canEdit}
            value={form.maxRentalDays}
            onChange={(e) =>
              setForm({ ...form, maxRentalDays: Number(e.target.value) })
            }
            className="border-border mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Support email
          <input
            type="email"
            disabled={!canEdit}
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            className="border-border mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        {canEdit ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
