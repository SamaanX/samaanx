"use client";

import { List, Map } from "lucide-react";
import * as React from "react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { MarketplaceSearchFilters } from "@/domain/search";
import { toSearchQueryString } from "@/domain/search";
import { ListingsBrowseMap } from "@/features/maps/components/lazy-listings-browse-map";
import { searchListingsPageAction } from "@/features/search/actions/search-listings";
import { ListingGrid } from "@/features/search/components/listing-grid";
import type {
  PublicListingCardView,
  SearchListingsResult,
} from "@/features/search/types/marketplace";
import { cn } from "@/lib/utils";

type SearchResultsProps = {
  initial: SearchListingsResult;
  filters: MarketplaceSearchFilters;
  isAuthenticated: boolean;
};

type ViewMode = "list" | "map";

/**
 * Progressive load-more (page append). Keeps RSC first paint; optional map view.
 */
export function SearchResults({
  initial,
  filters,
  isAuthenticated,
}: SearchResultsProps) {
  const [items, setItems] = React.useState(initial.items);
  const [page, setPage] = React.useState(initial.page);
  const [totalPages, setTotalPages] = React.useState(initial.totalPages);
  const [view, setView] = React.useState<ViewMode>("list");
  const [pending, startTransition] = useTransition();

  React.useEffect(() => {
    setItems(initial.items);
    setPage(initial.page);
    setTotalPages(initial.totalPages);
  }, [initial]);

  const hasMore = page < totalPages;
  const hasMapLocations = items.some(
    (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
  );

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
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          <List className="size-4" aria-hidden />
          List
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "map" ? "default" : "outline"}
          aria-pressed={view === "map"}
          disabled={!hasMapLocations}
          onClick={() => setView("map")}
        >
          <Map className="size-4" aria-hidden />
          Map
        </Button>
      </div>

      {view === "map" ? (
        <ListingsBrowseMap listings={items} />
      ) : (
        <ListingGrid listings={items} isAuthenticated={isAuthenticated} />
      )}

      {view === "list" && hasMore ? (
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

      {view === "map" && !hasMapLocations ? (
        <p className={cn("text-muted-foreground text-center text-sm")}>
          Map view needs listings with location data.
        </p>
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
