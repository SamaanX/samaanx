import { AdminDisputesClient } from "@/features/admin/components/admin-disputes-client";
import { getAdminDisputesPage } from "@/features/admin/queries/disputes";

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const data = await getAdminDisputesPage({ page });
  return <AdminDisputesClient initial={data} initialPage={page} />;
}
