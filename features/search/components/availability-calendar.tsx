import type { PublicListingDetailView } from "@/features/search/types/marketplace";
import { cn } from "@/lib/utils";

type AvailabilityCalendarProps = {
  availability: PublicListingDetailView["availability"];
};

export function AvailabilityCalendar({
  availability,
}: AvailabilityCalendarProps) {
  if (availability.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-2xl border border-dashed p-4 text-sm">
        No availability windows published yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">Availability</h3>
      <ul className="space-y-2">
        {availability.map((row) => (
          <li
            key={row.id}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm",
              row.type === "AVAILABLE"
                ? "border-brand-green/30 bg-brand-green/10"
                : "border-border bg-muted/50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {row.type === "AVAILABLE" ? "Available" : "Blocked"}
              </span>
              <span className="text-muted-foreground">
                {row.startDate} → {row.endDate}
              </span>
            </div>
            {row.notes ? (
              <p className="text-muted-foreground mt-1 text-xs">{row.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
