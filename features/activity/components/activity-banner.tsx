"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { getCriticalActivitySnapshotAction } from "@/features/activity/actions/get-critical-activity";
import type {
  ActivityAlert,
  ActivitySnapshot,
  ActivityTone,
} from "@/features/activity/types/activity";
import { queryKeys } from "@/lib/query-keys";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

const TONE_CLASS: Record<ActivityTone, string> = {
  green: "border-brand-green/25 bg-brand-green-soft/55 text-brand-green",
  yellow:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  orange:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  blue: "border-brand-blue/25 bg-brand-blue-soft/60 text-brand-blue",
  purple:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  red: "border-destructive/25 bg-destructive/10 text-destructive",
};

type ActivityBannerProps = {
  /** Reserved for layout callers; realtime sync is global via RealtimeSyncProvider. */
  userId?: string;
  preferredMode: AppUiMode;
  initial: ActivitySnapshot;
};

function AlertCard({ alert }: { alert: ActivityAlert }) {
  return (
    <Link
      href={alert.href}
      prefetch
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-opacity hover:opacity-95",
        TONE_CLASS[alert.tone],
      )}
    >
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{alert.title}</p>
        {alert.description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {alert.description}
          </p>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold">
          {alert.ctaLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ActivityBanner({
  preferredMode,
  initial,
}: ActivityBannerProps) {
  const { mode } = usePreferredMode(preferredMode);

  const query = useQuery({
    queryKey: queryKeys.activity.snapshot(mode),
    queryFn: async () => {
      const data = await getCriticalActivitySnapshotAction(mode);
      return (
        data ?? {
          alerts: [],
          sellerPendingCount: 0,
          buyerPendingCount: 0,
          buyerApprovedCount: 0,
          returnPendingCount: 0,
        }
      );
    },
    initialData: mode === preferredMode ? initial : undefined,
    initialDataUpdatedAt: mode === preferredMode ? Date.now() : undefined,
    // RSC already hydrated; realtime bumps invalidate when state changes.
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const alerts = query.data?.alerts ?? [];
  if (alerts.length === 0) return null;

  return (
    <div className="border-border/50 bg-background/80 border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:px-6">
        {alerts.slice(0, 2).map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}

/** Always-visible Home control for mobile header chrome. */
export function HeaderHomeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      prefetch
      aria-label="Home"
      className={cn(
        "text-brand-blue hover:bg-brand-blue-soft focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <Home className="size-5" aria-hidden />
    </Link>
  );
}
