"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  getSellerListingsAction,
  SELLER_LISTINGS_PAGE_SIZE,
} from "@/features/listings/actions/get-seller-listings";
import { LoadingButton } from "@/features/listings/components/loading-button";
import { SellerListingCard } from "@/features/listings/components/seller-listing-card";
import type { SellerListingCardView } from "@/features/listings/types/listing";
import { queryKeys } from "@/lib/query-keys";

type SellerListingsPanelProps = {
  initial: SellerListingCardView[];
  initialNextCursor: string | null;
};

export function SellerListingsPanel({
  initial,
  initialNextCursor,
}: SellerListingsPanelProps) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.sellerListings.list(),
    queryFn: async ({ pageParam }) => {
      const result = await getSellerListingsAction(
        pageParam as string | null | undefined,
      );
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: {
      pages: [{ listings: initial, nextCursor: initialNextCursor }],
      pageParams: [null],
    },
    initialDataUpdatedAt: Date.now(),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const listings =
    query.data?.pages.flatMap((page) => page.listings) ?? initial;

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
      {query.hasNextPage ? (
        <div className="pt-2">
          <LoadingButton
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more listings
          </LoadingButton>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Showing {listings.length} · {SELLER_LISTINGS_PAGE_SIZE} per page
          </p>
        </div>
      ) : null}
    </div>
  );
}
