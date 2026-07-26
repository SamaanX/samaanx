import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  formatMemberSinceShort,
  formatResponseTimeShort,
  formatSellerRating,
} from "@/features/search/services/format";
import type { SellerCardView } from "@/features/search/types/marketplace";
import { cn } from "@/lib/utils";

type SellerCardProps = {
  seller: SellerCardView;
};

export function SellerCard({ seller }: SellerCardProps) {
  return (
    <aside className="border-border/80 bg-card rounded-2xl border p-5 shadow-[var(--rp-shadow-sm)]">
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${seller.id}`}
          className="bg-muted focus-visible:ring-ring relative size-14 shrink-0 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          {seller.avatarUrl ? (
            <Image
              src={seller.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <span className="text-brand-blue flex size-full items-center justify-center text-lg font-semibold">
              {seller.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${seller.id}`}
              className="hover:text-brand-blue truncate text-base font-semibold"
            >
              {seller.displayName}
            </Link>
            {seller.verificationBadge === "VERIFIED" ? (
              <BadgeCheck
                className="text-brand-green size-4 shrink-0"
                aria-label="Verified seller"
              />
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-sm">
            <Star
              className="fill-brand-blue text-brand-blue size-3.5"
              aria-hidden
            />
            {formatSellerRating(seller.avgRating, seller.ratingCount)}
            {seller.ratingCount > 0
              ? ` · ${seller.ratingCount} review${seller.ratingCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Completed rentals</dt>
          <dd className="font-medium">{seller.completedRentalsCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium">
            {formatMemberSinceShort(seller.memberSince)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Response time</dt>
          <dd className="font-medium">
            {formatResponseTimeShort(seller.responseTimeMinutesAvg)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Location</dt>
          <dd className="font-medium">{seller.city ?? "—"}</dd>
        </div>
      </dl>

      <Link
        href={`/profile/${seller.id}`}
        className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
      >
        View profile
      </Link>
    </aside>
  );
}
