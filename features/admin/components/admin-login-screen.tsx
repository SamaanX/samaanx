import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

export function AdminLoginScreen() {
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="bg-brand-blue/8 absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl" />
        <div className="bg-brand-green/8 absolute bottom-0 left-0 h-56 w-56 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <AdminLoginForm />
      </div>
    </div>
  );
}
