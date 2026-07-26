"use client";

import { StatCard } from "@/features/admin/components/stat-card";

type AnalyticsClientProps = {
  summary: {
    topCategories: Array<{ name: string; count: number }>;
    topCities: Array<{ name: string; count: number }>;
    topSellers: Array<{
      id: string;
      displayName: string;
      completedRentalsCount: number;
      avgRating: unknown;
    }>;
    topListings: Array<{
      id: string;
      title: string;
      requestCount: number;
      viewCount: number;
      city: string;
    }>;
    approvalRate: number;
    cancellationRate: number;
    pendingRequests: number;
  };
};

export function AdminAnalyticsClient({ summary }: AnalyticsClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Marketplace performance insights
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Approval rate"
          value={`${summary.approvalRate}%`}
          tone="success"
        />
        <StatCard
          label="Cancellation rate"
          value={`${summary.cancellationRate}%`}
          tone="warning"
        />
        <StatCard label="Pending requests" value={summary.pendingRequests} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title="Top categories"
          items={summary.topCategories.map((c) => `${c.name} (${c.count})`)}
        />
        <RankList
          title="Top cities"
          items={summary.topCities.map((c) => `${c.name} (${c.count})`)}
        />
        <RankList
          title="Most active sellers"
          items={summary.topSellers.map(
            (s) => `${s.displayName} · ${s.completedRentalsCount} rentals`,
          )}
        />
        <RankList
          title="Most popular listings"
          items={summary.topListings.map(
            (l) => `${l.title} · ${l.requestCount} requests · ${l.city}`,
          )}
        />
      </div>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-border/70 bg-card rounded-xl border p-4 shadow-[var(--rp-shadow-xs)]">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <ol className="space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="flex gap-2">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
