"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Images, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  formatRentPrice,
  formatSellerRating,
} from "@/features/search/services/format";
import type { PublicListingCardView } from "@/features/search/types/marketplace";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: PublicListingCardView;
  isAuthenticated: boolean;
  /** Above-the-fold cards only — improves LCP. */
  priority?: boolean;
};

const availabilityStyles = {
  Available: "bg-brand-green/15 text-brand-green",
  Limited: "bg-brand-blue/10 text-brand-blue",
  "Check dates": "bg-muted text-muted-foreground",
  Unavailable: "bg-destructive/10 text-destructive",
} as const;

export function ListingCard({
  listing,
  isAuthenticated,
  priority = false,
}: ListingCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="group border-border/80 bg-card relative overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-sm)]"
    >
      <Link
        href={`/listings/${listing.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${listing.title}`}
      />

      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {listing.coverImageUrl ? (
          <Image
            src={listing.coverImageUrl}
            alt=""
            fill
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            No photo
          </div>
        )}

        <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
              availabilityStyles[listing.availabilityLabel],
            )}
          >
            {listing.availabilityLabel}
          </span>
        </div>

        <div className="absolute top-2 right-2 z-20">
          <WishlistButton
            listingId={listing.id}
            initialWishlisted={listing.isWishlisted}
            isAuthenticated={isAuthenticated}
            size="sm"
          />
        </div>

        {listing.imageCount > 1 ? (
          <span className="bg-card/95 text-foreground absolute right-2 bottom-2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium shadow-[var(--rp-shadow-xs)]">
            <Images className="text-brand-blue size-3" aria-hidden />
            {listing.imageCount}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-foreground line-clamp-2 text-sm font-semibold tracking-tight sm:text-[0.95rem]">
            {listing.title}
          </h3>
          {listing.verificationBadge === "VERIFIED" ? (
            <BadgeCheck
              className="text-brand-green mt-0.5 size-4 shrink-0"
              aria-label="Verified seller"
            />
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">{listing.categoryName}</p>

        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="text-brand-blue size-3" aria-hidden />
          <span className="truncate">
            {listing.area}, {listing.city}
            {listing.distanceKm != null ? ` · ${listing.distanceKm} km` : ""}
          </span>
        </p>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-foreground text-sm font-semibold">
            {formatRentPrice(
              listing.rentPriceAmount,
              listing.currency,
              listing.rentPriceUnit,
            )}
          </p>
          <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Star
              className="fill-brand-blue text-brand-blue size-3"
              aria-hidden
            />
            {formatSellerRating(
              listing.sellerRating,
              listing.sellerRatingCount,
            )}
          </p>
        </div>

        <p className="text-muted-foreground text-[0.7rem]">
          {listing.sellerCompletedRentals > 0
            ? `${listing.sellerCompletedRentals} completed`
            : "New seller"}
          {listing.sellerResponseMinutes != null
            ? ` · ~${listing.sellerResponseMinutes}m reply`
            : ""}
        </p>
      </div>
    </motion.article>
  );
}
