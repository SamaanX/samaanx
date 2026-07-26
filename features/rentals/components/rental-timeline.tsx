import type { RentalStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const STEPS: Array<{ key: RentalStatus | "START"; label: string }> = [
  { key: "START", label: "Requested" },
  { key: "APPROVED", label: "Approved" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
];

function stepIndex(status: RentalStatus): number {
  switch (status) {
    case "REQUESTED":
      return 0;
    case "APPROVED":
    case "HANDOVER_PENDING":
      return 1;
    case "ACTIVE":
    case "RETURN_PENDING":
      return 2;
    case "COMPLETED":
      return 3;
    case "REJECTED":
    case "CANCELLED":
    case "EXPIRED":
      return -1;
    default:
      return 0;
  }
}

type RentalTimelineProps = {
  status: RentalStatus;
  className?: string;
};

export function RentalTimeline({ status, className }: RentalTimelineProps) {
  const active = stepIndex(status);
  const terminal =
    status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED";

  if (terminal) {
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        Timeline ended — status is {status.toLowerCase()}.
      </p>
    );
  }

  return (
    <ol
      className={cn("flex flex-wrap gap-2", className)}
      aria-label="Rental progress"
    >
      {STEPS.map((step, index) => {
        const done = active >= index;
        return (
          <li
            key={step.label}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
              done
                ? "bg-brand-blue text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
