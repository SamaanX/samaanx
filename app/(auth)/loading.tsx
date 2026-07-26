import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export default function AuthLoading() {
  return (
    <div className="border-border/70 bg-card w-full rounded-3xl border p-6 shadow-[var(--rp-shadow-lg)] sm:p-8">
      <AuthFormSkeleton />
    </div>
  );
}
