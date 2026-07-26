import { AdminDisputesClient } from "@/features/admin/components/admin-disputes-client";
import { getAdminDisputesPage } from "@/features/admin/queries/disputes";

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const data = await getAdminDisputesPage({ page: Number(params.page ?? "1") });
  return <AdminDisputesClient initial={data} />;
}
