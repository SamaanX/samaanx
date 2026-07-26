import Link from "next/link";

import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo/json-ld";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <p className="text-brand-blue text-sm font-semibold tracking-widest uppercase">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This page may have moved or the link is outdated.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="bg-brand-gradient rounded-xl px-5 py-2.5 text-sm font-medium text-white"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="border-border rounded-xl border px-5 py-2.5 text-sm font-medium"
        >
          Search rentals
        </Link>
      </div>
    </main>
  );
}
