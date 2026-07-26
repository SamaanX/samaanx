"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { adminSearchAction } from "@/features/admin/actions/settings-actions";
import type { AdminSearchResult } from "@/features/admin/types/admin";

export function AdminSearchClient() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<AdminSearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await adminSearchAction({ q });
      setLoading(false);
      if (res.ok) setResults(res.data);
      else toast.error(res.error.message);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Global search</h1>
        <p className="text-muted-foreground text-sm">
          Users, listings, rentals, reports
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="border-border bg-background w-full max-w-xl rounded-xl border px-4 py-3 text-sm"
      />
      {loading ? (
        <p className="text-muted-foreground text-sm">Searching…</p>
      ) : null}
      {results ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(["users", "listings", "rentals", "reports"] as const).map(
            (group) => (
              <section
                key={group}
                className="border-border/70 bg-card rounded-xl border p-4"
              >
                <h2 className="mb-2 text-sm font-semibold capitalize">
                  {group}
                </h2>
                <ul className="space-y-2 text-sm">
                  {results[group].length === 0 ? (
                    <li className="text-muted-foreground">No matches</li>
                  ) : (
                    results[group].map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="hover:text-brand-blue text-left"
                          onClick={() => router.push(item.href)}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
