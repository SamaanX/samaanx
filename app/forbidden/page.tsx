import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold tracking-widest text-amber-600 uppercase">
        403
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Permission denied
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        You don&apos;t have access to this page. Sign in with the right account
        or go back.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="bg-brand-gradient rounded-xl px-5 py-2.5 text-sm font-medium text-white"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="border-border rounded-xl border px-5 py-2.5 text-sm font-medium"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
