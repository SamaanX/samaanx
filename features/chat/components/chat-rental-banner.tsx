"use client";

import Link from "next/link";

import type { ChatRentalBanner } from "@/features/chat/types/chat";
import { cn } from "@/lib/utils";

const TONE: Record<ChatRentalBanner["tone"], string> = {
  blue: "border-brand-blue/25 bg-brand-blue-soft/50 text-brand-blue",
  green: "border-brand-green/25 bg-brand-green-soft/55 text-brand-green",
  yellow:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  orange:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  purple:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  red: "border-destructive/25 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/50 text-muted-foreground",
};

export function ChatRentalBannerCard({ banner }: { banner: ChatRentalBanner }) {
  return (
    <div
      className={cn(
        "mx-3 rounded-2xl border px-3.5 py-2.5 sm:mx-4",
        TONE[banner.tone],
      )}
      role="status"
    >
      <p className="text-foreground text-sm font-semibold">{banner.title}</p>
      {banner.description ? (
        <p className="text-muted-foreground mt-0.5 text-xs">
          {banner.description}
        </p>
      ) : null}
      {banner.href && banner.ctaLabel ? (
        <Link
          href={banner.href}
          className="mt-2 inline-flex text-xs font-semibold underline-offset-4 hover:underline"
        >
          {banner.ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
