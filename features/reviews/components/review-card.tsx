"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import type { ReviewCardView } from "@/features/reviews/types/review";
import { StarRatingDisplay } from "@/features/trust/components/star-rating";
import { cn } from "@/lib/utils";

type ReviewCardProps = {
  review: ReviewCardView;
  className?: string;
  showReport?: boolean;
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function formatReviewDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatRentalWindow(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

export function ReviewCard({
  review,
  className,
  showReport = true,
}: ReviewCardProps) {
  return (
    <article
      className={cn(
        "border-border/70 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href={`/profile/${review.reviewer.id}`}
            className="focus-visible:ring-ring shrink-0 rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <Avatar className="border-border/60 size-10 border">
              {review.reviewer.avatarUrl ? (
                <AvatarImage
                  src={review.reviewer.avatarUrl}
                  alt=""
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="text-sm font-semibold">
                {initials(review.reviewer.displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              href={`/profile/${review.reviewer.id}`}
              className="hover:text-brand-blue truncate text-sm font-semibold"
            >
              {review.reviewer.displayName}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <StarRatingDisplay value={review.rating} />
              <time
                dateTime={review.createdAt}
                className="text-muted-foreground text-xs"
              >
                {formatReviewDate(review.createdAt)}
              </time>
            </div>
          </div>
        </div>
        {showReport ? (
          <ReportDialog
            target={{
              targetType: "REVIEW",
              targetId: review.id,
              label: "review",
            }}
            triggerLabel=""
            triggerClassName="shrink-0"
          />
        ) : null}
      </div>

      {review.comment ? (
        <p className="text-foreground/90 mt-3 text-sm leading-relaxed whitespace-pre-wrap">
          {review.comment}
        </p>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm italic">
          No written review.
        </p>
      )}

      <p className="text-muted-foreground mt-3 text-xs">
        Rented {review.listingTitle} ·{" "}
        {formatRentalWindow(review.rentalStartDate, review.rentalEndDate)}
      </p>
    </article>
  );
}
