"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE } from "@/config/constants";
import {
  archiveListingAction,
  deleteListingAction,
  pauseListingAction,
  publishListingAction,
} from "@/features/listings/actions";
import { FormMessage } from "@/features/listings/components/form-message";
import { ListingStatusBadge } from "@/features/listings/components/listing-status-badge";
import type { SellerListingCardView } from "@/features/listings/types/listing";
import { bumpLiveSurfaces } from "@/features/realtime/live-sync";

type SellerListingCardProps = {
  listing: SellerListingCardView;
};

function formatPrice(listing: SellerListingCardView): string {
  const amount = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.rentPriceAmount);

  const unit =
    listing.rentPriceUnit === "DAY"
      ? "day"
      : listing.rentPriceUnit === "WEEK"
        ? "week"
        : "month";

  return `${amount}/${unit}`;
}

function formatCreated(iso: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function SellerListingCard({ listing }: SellerListingCardProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function runAction(
    action: (
      id: string,
    ) => Promise<{ ok: true } | { ok: false; error: { message: string } }>,
  ) {
    setError(null);
    setBusy(true);
    const result = await action(listing.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    bumpLiveSurfaces(queryClient, ["sellerListings"]);
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-border/80 bg-card/90 overflow-hidden rounded-[var(--rp-radius-xl)] border shadow-[var(--rp-shadow-sm)]"
    >
      <div className="flex gap-3 p-3">
        <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
              No photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-sm font-semibold tracking-tight sm:text-base">
              {listing.title}
            </h2>
            <ListingStatusBadge status={listing.status} />
          </div>
          <p className="text-sm font-medium">{formatPrice(listing)}</p>
          <p className="text-muted-foreground text-xs">
            {listing.categoryName} · {listing.city}
          </p>
          <p className="text-muted-foreground text-xs">
            Created {formatCreated(listing.createdAt)} · {listing.viewCount}{" "}
            views · {listing.requestCount} requests
          </p>
        </div>
      </div>

      <div className="border-border/70 flex flex-wrap gap-2 border-t px-3 py-2.5">
        <Link
          href={`/seller/listings/${listing.id}/edit`}
          className="border-border bg-background hover:bg-muted inline-flex h-9 items-center rounded-lg border px-2.5 text-[0.8rem] font-medium"
        >
          Edit
        </Link>

        {listing.status === "DRAFT" || listing.status === "PAUSED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            disabled={busy}
            onClick={() => void runAction(publishListingAction)}
          >
            Publish
          </Button>
        ) : null}

        {listing.status === "ACTIVE" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            disabled={busy}
            onClick={() => void runAction(pauseListingAction)}
          >
            Pause
          </Button>
        ) : null}

        {listing.status !== "ARCHIVED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            disabled={busy}
            onClick={() => void runAction(archiveListingAction)}
          >
            Archive
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-9 rounded-lg"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm("Delete this listing? Photos will be removed.")
            ) {
              void runAction(deleteListingAction);
            }
          }}
        >
          Delete
        </Button>
      </div>

      <div className="px-3 pb-3">
        <FormMessage message={error} />
      </div>
    </motion.article>
  );
}
