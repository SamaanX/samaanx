import { StarRatingDisplay } from "@/features/trust/components/star-rating";
import type { RatingBreakdown } from "@/features/trust/lib/seller-level";
import { cn } from "@/lib/utils";

type RatingBreakdownPanelProps = {
  breakdown: RatingBreakdown;
  className?: string;
};

export function RatingBreakdownPanel({
  breakdown,
  className,
}: RatingBreakdownPanelProps) {
  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <section
      className={cn(
        "border-border/70 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)] sm:p-5",
        className,
      )}
      aria-labelledby="rating-breakdown-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="rating-breakdown-heading"
            className="text-muted-foreground text-sm font-medium tracking-wide uppercase"
          >
            Overall rating
          </h2>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {breakdown.total === 0 ? "—" : breakdown.average.toFixed(1)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <StarRatingDisplay value={breakdown.average} size="md" />
            <span className="text-muted-foreground text-sm">
              {breakdown.total} review{breakdown.total === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2" aria-label="Rating distribution">
        {stars.map((star) => {
          const pct = breakdown.percents[star];
          return (
            <li key={star} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-12 shrink-0">
                {star} star
              </span>
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-brand-blue h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-muted-foreground w-10 shrink-0 text-right tabular-nums">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
