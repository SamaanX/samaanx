"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { getSellerListingsAction } from "@/features/listings/actions/get-seller-listings";
import { SellerListingCard } from "@/features/listings/components/seller-listing-card";
import type { SellerListingCardView } from "@/features/listings/types/listing";
import { queryKeys } from "@/lib/query-keys";

type SellerListingsPanelProps = {
  initial: SellerListingCardView[];
};

export function SellerListingsPanel({ initial }: SellerListingsPanelProps) {
  const query = useQuery({
    queryKey: queryKeys.sellerListings.list(),
    queryFn: async () => {
      const result = await getSellerListingsAction();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    initialData: initial,
    initialDataUpdatedAt: Date.now(),
    staleTime: 60_000,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const listings = query.data ?? initial;

  if (listings.length === 0) {
    return (
      <div className="border-border bg-card rounded-[var(--rp-radius-xl)] border border-dashed px-6 py-16 text-center shadow-[var(--rp-shadow-xs)]">
        <p className="text-base font-medium">No listings yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Create your first listing to start renting out items.
        </p>
        <Link
          href="/seller/listings/new"
          className="bg-brand-gradient mt-6 inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium text-white shadow-[var(--rp-shadow-sm)] transition-transform hover:-translate-y-px"
        >
          Create listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <SellerListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
