import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to SamaanX to rent or list items nearby.",
};

export default function LoginPage() {
  return (
    <AuthCard>
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
