import { BadgeCheck, MapPin, MessageSquare, Store } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  formatCancellationRate,
  formatMemberSince,
  formatResponseTime,
  modeLabel,
} from "@/features/profile/utils/format";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import type { PublicProfileView } from "@/features/reviews/types/review";
import { StarRatingDisplay } from "@/features/trust/components/star-rating";
import { TrustBadgeRow } from "@/features/trust/components/trust-badge-row";
import { cn } from "@/lib/utils";

type PublicProfileHeroProps = {
  profile: PublicProfileView;
  isOwn?: boolean;
  viewerId?: string | null;
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-muted/35 min-w-0 rounded-xl border px-3 py-3 text-center sm:text-left">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

export function PublicProfileHero({
  profile,
  isOwn = false,
  viewerId = null,
}: PublicProfileHeroProps) {
  const location = [profile.area, profile.city].filter(Boolean).join(", ");
  const verified = profile.verificationBadge === "VERIFIED";

  return (
    <section className="border-border/70 bg-card rounded-[1.35rem] border px-4 py-5 shadow-[var(--rp-shadow-xs)] sm:rounded-[1.5rem] sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar className="border-border/80 mx-auto size-24 shrink-0 rounded-[1.35rem] border sm:mx-0 sm:size-28">
          {profile.avatarUrl ? (
            <AvatarImage
              src={profile.avatarUrl}
              alt=""
              className="rounded-[1.25rem] object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-[1.25rem] text-3xl font-semibold">
            {initials(profile.displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              {profile.displayName}
            </h1>
            {verified ? (
              <span className="bg-brand-green-soft text-brand-green inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
                <BadgeCheck className="size-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
            <span className="border-border/70 bg-muted/50 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
              {profile.level.label}
            </span>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:justify-start">
            {location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {location}
              </span>
            ) : null}
            <span>Member since {formatMemberSince(profile.memberSince)}</span>
            <span>{modeLabel(profile.preferredMode)} preference</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <StarRatingDisplay value={profile.avgRating} size="md" />
            <span className="text-sm font-medium">
              {profile.ratingCount === 0
                ? "No reviews yet"
                : `${profile.avgRating.toFixed(1)} · ${profile.ratingCount} review${profile.ratingCount === 1 ? "" : "s"}`}
            </span>
          </div>

          <TrustBadgeRow
            badges={profile.badges}
            className="justify-center sm:justify-start"
          />

          {profile.bio ? (
            <p className="text-foreground/90 mx-auto max-w-2xl text-sm leading-relaxed sm:mx-0">
              {profile.bio}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {profile.activeListingsCount > 0 ? (
              <a
                href="#active-listings"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <Store className="size-4" aria-hidden />
                View active listings
              </a>
            ) : null}
            {!isOwn && viewerId ? (
              <Link
                href="/chat"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <MessageSquare className="size-4" aria-hidden />
                Contact via rental
              </Link>
            ) : null}
            {isOwn ? (
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Edit profile
              </Link>
            ) : null}
            {!isOwn ? (
              <ReportDialog
                target={{
                  targetType: "USER",
                  targetId: profile.id,
                  label: profile.displayName,
                }}
                variant="outline"
                triggerLabel="Report"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <Stat label="Completed" value={String(profile.completedRentalsCount)} />
        <Stat
          label="Response"
          value={formatResponseTime(profile.responseTimeMinutesAvg)}
        />
        <Stat
          label="Cancellation"
          value={formatCancellationRate(profile.cancellationRate)}
        />
        <Stat
          label="Active listings"
          value={String(profile.activeListingsCount)}
        />
        <Stat label="Reviews" value={String(profile.ratingCount)} />
      </div>
    </section>
  );
}
