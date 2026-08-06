"use client";

import Link from "next/link";

import { GrowthChart } from "@/features/admin/components/growth-chart";
import { StatCard } from "@/features/admin/components/stat-card";
import type {
  AdminDashboardStats,
  AdminGrowthPoint,
} from "@/features/admin/types/admin";

type AdminDashboardClientProps = {
  stats: AdminDashboardStats;
  growth: AdminGrowthPoint[];
  recent: {
    reports: Array<{
      id: string;
      type: string;
      status: string;
      createdAt: Date;
      reporter: { displayName: string };
    }>;
    rentals: Array<{
      id: string;
      status: string;
      createdAt: Date;
      listing: { title: string };
    }>;
    listings: Array<{
      id: string;
      title: string;
      moderationStatus: string;
      createdAt: Date;
    }>;
    users: Array<{
      id: string;
      displayName: string;
      email: string;
      createdAt: Date;
    }>;
  };
};

export function AdminDashboardClient({
  stats,
  growth,
  recent,
}: AdminDashboardClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Platform overview and live operations snapshot.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} />
        <StatCard label="Buyers" value={stats.buyers} />
        <StatCard label="Sellers" value={stats.sellers} />
        <StatCard label="Verified sellers" value={stats.verifiedSellers} />
        <StatCard label="Listings" value={stats.listings} />
        <StatCard
          label="Active listings"
          value={stats.activeListings}
          tone="success"
        />
        <StatCard
          label="Pending moderation"
          value={stats.pendingListings}
          tone="warning"
        />
        <StatCard
          label="Rejected listings"
          value={stats.rejectedListings}
          tone="danger"
        />
        <StatCard label="Rentals" value={stats.rentals} />
        <StatCard label="Completed rentals" value={stats.completedRentals} />
        <StatCard
          label="Open reports"
          value={stats.openReports}
          tone="warning"
        />
        <StatCard
          label="Open feedback"
          value={stats.openFeedback}
          tone="warning"
        />
        <StatCard
          label="Open disputes"
          value={stats.openDisputes}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GrowthChart data={growth} metric="users" label="Daily new users" />
        <GrowthChart
          data={growth}
          metric="listings"
          label="Daily new listings"
        />
        <GrowthChart data={growth} metric="rentals" label="Daily new rentals" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-border/70 bg-card rounded-[var(--rp-radius-xl)] border p-4 shadow-[var(--rp-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest reports</h2>
            <Link href="/admin/reports" className="text-brand-blue text-xs">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {recent.reports.map((r) => (
              <li
                key={r.id}
                className="border-border/40 flex justify-between gap-3 border-b pb-2 last:border-0"
              >
                <span>
                  {r.type} · {r.reporter.displayName}
                </span>
                <span className="text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-border/70 bg-card rounded-[var(--rp-radius-xl)] border p-4 shadow-[var(--rp-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest users</h2>
            <Link href="/admin/users" className="text-brand-blue text-xs">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {recent.users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="hover:text-brand-blue"
                >
                  {u.displayName} · {u.email}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
