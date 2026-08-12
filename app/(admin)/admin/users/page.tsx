import { AdminUsersClient } from "@/features/admin/components/admin-users-client";
import { getAdminUsersPage } from "@/features/admin/queries/users";
import { getCurrentProfile } from "@/lib/auth/guards";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const q = params.q;

  const [profile, data] = await Promise.all([
    getCurrentProfile(),
    getAdminUsersPage({ page, q }),
  ]);

  return (
    <AdminUsersClient
      initial={data}
      viewerRole={profile?.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"}
      initialQ={q}
      initialPage={page}
    />
  );
}
