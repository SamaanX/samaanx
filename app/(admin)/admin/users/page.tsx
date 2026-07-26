import { AdminUsersClient } from "@/features/admin/components/admin-users-client";
import { getAdminUsersPage } from "@/features/admin/queries/users";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const data = await getAdminUsersPage({ page, q: params.q });

  return (
    <AdminUsersClient
      initial={data}
      viewerRole={profile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"}
      initialQ={params.q}
    />
  );
}
