import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = {
  title: "Reset password",
  description: "Choose a new SamaanX password.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ code?: string }>;
};

/**
 * Password recovery emails land here with ?code=.
 * Exchange via existing /auth/callback, then return to this form.
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  if (params.code) {
    const next = encodeURIComponent("/reset-password");
    redirect(
      `/auth/callback?code=${encodeURIComponent(params.code)}&next=${next}`,
    );
  }

  return (
    <AuthCard>
      <ResetPasswordForm />
    </AuthCard>
  );
}
