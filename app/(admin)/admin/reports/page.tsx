import { AdminReportsClient } from "@/features/admin/components/admin-reports-client";
import { getAdminReportsPage } from "@/features/admin/queries/reports";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const data = await getAdminReportsPage({ page });
  return <AdminReportsClient initial={data} initialPage={page} />;
}
