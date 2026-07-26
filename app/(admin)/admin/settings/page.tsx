import { AdminSettingsClient } from "@/features/admin/components/admin-settings-client";
import { getPlatformSettings } from "@/features/admin/queries/settings";
import { getCurrentProfile } from "@/lib/auth/guards";

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  const settings = await getPlatformSettings();
  const canEdit = profile?.role === "SUPER_ADMIN";
  return <AdminSettingsClient settings={settings} canEdit={Boolean(canEdit)} />;
}
