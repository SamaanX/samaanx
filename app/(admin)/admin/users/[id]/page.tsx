import { notFound } from "next/navigation";

import { AdminUserDetailClient } from "@/features/admin/components/admin-user-detail-client";
import { getAdminUserDetail } from "@/features/admin/queries/users";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();
  return <AdminUserDetailClient user={user} />;
}
