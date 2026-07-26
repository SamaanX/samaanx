import { AdminAccessDenied } from "@/features/admin/components/admin-access-denied";
import { AdminLoginScreen } from "@/features/admin/components/admin-login-screen";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { isAdminRole } from "@/features/admin/services/permissions";
import { getCurrentProfile } from "@/lib/auth/guards";
import { getCurrentUser, isAnonymousUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user || isAnonymousUser(user)) {
    return <AdminLoginScreen />;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return <AdminLoginScreen />;
  }

  if (!isAdminRole(profile.role)) {
    return <AdminAccessDenied email={profile.email} />;
  }

  const role = profile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

  return (
    <AdminShell role={role} displayName={profile.displayName}>
      {children}
    </AdminShell>
  );
}
