"use client";

import * as React from "react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { MarketplaceSearchFilters } from "@/domain/search";
import { toSearchQueryString } from "@/domain/search";
import { searchListingsPageAction } from "@/features/search/actions/search-listings";
import { ListingGrid } from "@/features/search/components/listing-grid";
import type {
  PublicListingCardView,
  SearchListingsResult,
} from "@/features/search/types/marketplace";

type SearchResultsProps = {
  initial: SearchListingsResult;
  filters: MarketplaceSearchFilters;
  isAuthenticated: boolean;
};

/**
 * Progressive load-more (page append). Keeps RSC first paint; no full remount.
 */
export function SearchResults({
  initial,
  filters,
  isAuthenticated,
}: SearchResultsProps) {
  const [items, setItems] = React.useState(initial.items);
  const [page, setPage] = React.useState(initial.page);
  const [totalPages, setTotalPages] = React.useState(initial.totalPages);
  const [pending, startTransition] = useTransition();

  React.useEffect(() => {
    setItems(initial.items);
    setPage(initial.page);
    setTotalPages(initial.totalPages);
  }, [initial]);

  const hasMore = page < totalPages;

  function loadMore() {
    if (!hasMore || pending) return;
    startTransition(async () => {
      const query = toSearchQueryString({ ...filters, page: page + 1 });
      const params = Object.fromEntries(new URLSearchParams(query).entries());
      const next = await searchListingsPageAction(params);
      setItems((prev) => mergeUnique(prev, next.items));
      setPage(next.page);
      setTotalPages(next.totalPages);
    });
  }

  return (
    <div className="space-y-4">
      <ListingGrid listings={items} isAuthenticated={isAuthenticated} />
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={loadMore}
          >
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function mergeUnique(
  prev: PublicListingCardView[],
  next: PublicListingCardView[],
): PublicListingCardView[] {
  const seen = new Set(prev.map((item) => item.id));
  const merged = [...prev];
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}
