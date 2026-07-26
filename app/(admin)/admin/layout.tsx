import { redirect } from "next/navigation";

import { AdminShell } from "@/features/admin/components/admin-shell";
import { isAdminRole } from "@/features/admin/services/permissions";
import { getCurrentProfile, requireAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  const profile = await getCurrentProfile();
  if (!profile || !isAdminRole(profile.role)) {
    redirect("/");
  }

  const role = profile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

  return (
    <AdminShell role={role} displayName={profile.displayName}>
      {children}
    </AdminShell>
  );
}
