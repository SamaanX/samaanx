"use client";

import type { ListingStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ListingStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE:
    "bg-brand-green-soft text-[color:var(--brand-blue)] dark:bg-brand-green/20 dark:text-brand-green",
  PAUSED: "bg-secondary text-secondary-foreground",
  SOLD_OUT: "bg-orange-500/15 text-orange-800 dark:text-orange-200",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  SOLD_OUT: "Sold out",
  ARCHIVED: "Archived",
};

type ListingStatusBadgeProps = {
  status: ListingStatus;
  className?: string;
};

export function ListingStatusBadge({
  status,
  className,
}: ListingStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
