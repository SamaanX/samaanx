"use client";

import type { AdminGrowthPoint } from "@/features/admin/types/admin";

type GrowthChartProps = {
  data: AdminGrowthPoint[];
  metric: "users" | "listings" | "rentals";
  label: string;
};

export function GrowthChart({ data, metric, label }: GrowthChartProps) {
  const max = Math.max(...data.map((d) => d[metric]), 1);

  return (
    <div className="border-border/70 bg-card rounded-[var(--rp-radius-xl)] border p-4 shadow-[var(--rp-shadow-xs)]">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-4 flex h-32 items-end gap-1">
        {data.slice(-14).map((point) => {
          const value = point[metric];
          const height = `${Math.max(4, (value / max) * 100)}%`;
          return (
            <div
              key={point.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                title={`${point.date}: ${value}`}
                className="bg-brand-blue/70 dark:bg-brand-green/70 w-full rounded-t"
                style={{ height }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
