import { AdminActivityClient } from "@/features/admin/components/admin-activity-client";
import { getAdminAuditLogsPage } from "@/features/admin/queries/audit-logs";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const data = await getAdminAuditLogsPage({
    page: Number(params.page ?? "1"),
  });
  return <AdminActivityClient initial={data} />;
}
