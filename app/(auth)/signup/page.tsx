import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata = {
  title: "Create account",
  description: "Join SamaanX to rent from people nearby.",
};

export default function SignupPage() {
  return (
    <AuthCard>
      <SignupForm />
    </AuthCard>
  );
}
