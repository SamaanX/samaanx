"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background min-h-dvh font-sans antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-sm font-semibold tracking-widest text-red-600 uppercase">
            Something went wrong
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            We hit an unexpected error
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Please try again. If the problem continues, come back later.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="bg-brand-gradient rounded-xl px-5 py-2.5 text-sm font-medium text-white"
            >
              Try again
            </button>
            <Link
              href="/"
              className="border-border rounded-xl border px-5 py-2.5 text-sm font-medium"
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
