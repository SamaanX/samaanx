import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-brand-blue text-sm font-semibold tracking-widest uppercase">
        Maintenance
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        We&apos;ll be right back
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        SamaanX is undergoing scheduled maintenance. Please check again shortly.
      </p>
    </main>
  );
}
