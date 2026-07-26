import { AdminAnnouncementsClient } from "@/features/admin/components/admin-settings-client";
import { getAdminAnnouncements } from "@/features/admin/queries/settings";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAdminAnnouncements();
  return <AdminAnnouncementsClient announcements={announcements} />;
}
