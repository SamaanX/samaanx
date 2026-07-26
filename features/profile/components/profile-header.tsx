"use client";

import { BadgeCheck, MapPin, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploader } from "@/features/profile/components/avatar-uploader";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import {
  formatCancellationRate,
  formatMemberSince,
  formatRating,
  formatResponseTime,
  modeLabel,
  verificationLabel,
} from "@/features/profile/utils/format";
import { cn } from "@/lib/utils";

type ProfileHeaderProps = {
  profile: ProfileViewModel;
  onProfileChange: (profile: ProfileViewModel) => void;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "R";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-muted/40 min-w-0 rounded-xl border px-3 py-3 text-center sm:px-4 sm:text-left">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 truncate text-base font-semibold tracking-tight sm:text-lg">
        {value}
      </p>
    </div>
  );
}

export function ProfileHeader({
  profile,
  onProfileChange,
  className,
}: ProfileHeaderProps) {
  const verified = profile.verificationBadge === "VERIFIED";
  const location = [profile.area, profile.city].filter(Boolean).join(", ");

  return (
    <section
      aria-labelledby="profile-identity-heading"
      className={cn(
        "border-border/70 bg-card rounded-[1.35rem] border px-4 py-5 shadow-[var(--rp-shadow-xs)] sm:rounded-[1.5rem] sm:px-6 sm:py-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative shrink-0">
          <Avatar className="border-border/80 bg-muted size-[5.5rem] rounded-[1.25rem] border sm:size-24 sm:rounded-[1.35rem]">
            {profile.avatarUrl ? (
              <AvatarImage
                src={profile.avatarUrl}
                alt=""
                className="rounded-[1.15rem] object-cover sm:rounded-[1.25rem]"
              />
            ) : null}
            <AvatarFallback className="bg-muted text-foreground rounded-[1.15rem] text-2xl font-semibold sm:rounded-[1.25rem] sm:text-3xl">
              {initials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -right-1 -bottom-1">
            <AvatarUploader
              profile={profile}
              onProfileChange={onProfileChange}
              variant="fab"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:pt-1 sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1
              id="profile-identity-heading"
              className="text-foreground max-w-[16rem] truncate text-2xl font-semibold tracking-tight sm:max-w-none sm:text-[1.75rem]"
            >
              {profile.displayName}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                verified
                  ? "bg-brand-green-soft dark:bg-brand-green/20 dark:text-brand-green text-[color:var(--brand-blue)]"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {verified ? (
                <BadgeCheck className="size-3.5" aria-hidden />
              ) : null}
              {verificationLabel(profile.verificationBadge)}
            </span>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:justify-start">
            {location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {location}
              </span>
            ) : (
              <span>Add your city to help nearby rentals</span>
            )}
            <span className="text-border hidden sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Star
                className="text-muted-foreground size-3.5 shrink-0"
                aria-hidden
              />
              {formatRating(profile)}
            </span>
          </div>

          <p className="text-muted-foreground text-xs">
            {modeLabel(profile.preferredMode)} · Member since{" "}
            {formatMemberSince(profile.memberSince)}
          </p>
        </div>
      </div>

      {profile.bio ? (
        <p className="border-border/50 text-muted-foreground mt-4 border-t pt-4 text-sm leading-relaxed">
          {profile.bio}
        </p>
      ) : null}

      <div className="border-border/50 mt-5 grid grid-cols-3 gap-2 border-t pt-5 sm:gap-3">
        <StatTile
          label="Completed"
          value={String(profile.completedRentalsCount)}
        />
        <StatTile
          label="Response"
          value={
            profile.responseTimeMinutesAvg === null
              ? "—"
              : formatResponseTime(profile.responseTimeMinutesAvg).replace(
                  " avg",
                  "",
                )
          }
        />
        <StatTile
          label="Cancel rate"
          value={formatCancellationRate(profile.cancellationRate)}
        />
      </div>
    </section>
  );
}
