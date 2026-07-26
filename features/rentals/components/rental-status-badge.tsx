import type { RentalStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RentalStatus, string> = {
  REQUESTED: "bg-brand-blue/15 text-brand-blue",
  APPROVED: "bg-brand-green/15 text-brand-green",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
  ACTIVE: "bg-brand-green/20 text-brand-green",
  COMPLETED: "bg-brand-blue-soft text-brand-blue",
  HANDOVER_PENDING: "bg-brand-green/10 text-brand-green",
  RETURN_PENDING: "bg-brand-blue/10 text-brand-blue",
  EXPIRED: "bg-muted text-muted-foreground",
  DISPUTED: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<RentalStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  HANDOVER_PENDING: "Handover pending",
  RETURN_PENDING: "Return pending",
  EXPIRED: "Expired",
  DISPUTED: "Disputed",
};

type RentalStatusBadgeProps = {
  status: RentalStatus;
  className?: string;
};

export function RentalStatusBadge({
  status,
  className,
}: RentalStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
