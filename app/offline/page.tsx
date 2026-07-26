import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-brand-blue text-sm font-semibold tracking-widest uppercase">
        Offline
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Check your connection. Rental and chat data need the internet — cached
        pages may still be available.
      </p>
      <Link
        href="/"
        className="bg-brand-gradient mt-8 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
      >
        Retry from home
      </Link>
    </main>
  );
}
