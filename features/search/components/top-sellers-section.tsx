import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatSellerRating } from "@/features/search/services/format";
import type { TopSellerView } from "@/features/search/types/marketplace";

type TopSellersSectionProps = {
  sellers: TopSellerView[];
};

export function TopSellersSection({ sellers }: TopSellersSectionProps) {
  if (sellers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Highest Rated Sellers
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Trusted community members with strong rental track records.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sellers.map((seller) => (
          <div
            key={seller.id}
            className="border-border/80 bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)]"
          >
            <Link
              href={`/profile/${seller.id}`}
              className="bg-muted focus-visible:ring-ring relative size-12 shrink-0 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:outline-none"
            >
              {seller.avatarUrl ? (
                <Image
                  src={seller.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <span className="text-brand-blue flex size-full items-center justify-center text-sm font-semibold">
                  {seller.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/profile/${seller.id}`}
                  className="hover:text-brand-blue truncate text-sm font-semibold"
                >
                  {seller.displayName}
                </Link>
                {seller.verificationBadge === "VERIFIED" ? (
                  <BadgeCheck
                    className="text-brand-green size-4 shrink-0"
                    aria-label="Verified"
                  />
                ) : null}
              </div>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                <Star
                  className="fill-brand-blue text-brand-blue size-3"
                  aria-hidden
                />
                {formatSellerRating(seller.avgRating, seller.ratingCount)} ·{" "}
                {seller.activeListingCount} active
              </p>
              {seller.city ? (
                <p className="text-muted-foreground truncate text-xs">
                  {seller.city}
                </p>
              ) : null}
            </div>
            <Link
              href={`/profile/${seller.id}`}
              className="text-brand-blue text-xs font-medium underline-offset-4 hover:underline"
            >
              View profile
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
