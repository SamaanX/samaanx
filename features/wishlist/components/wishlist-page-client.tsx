"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingGrid } from "@/features/search/components/listing-grid";
import type { PublicListingCardView } from "@/features/search/types/marketplace";
import { getWishlistListingsAction } from "@/features/wishlist/actions/get-wishlist";
import type { WishlistSort } from "@/features/wishlist/types/wishlist";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type WishlistPageClientProps = {
  initialItems: PublicListingCardView[];
};

export function WishlistPageClient({ initialItems }: WishlistPageClientProps) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<WishlistSort>("recent");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQ, setDebouncedQ] = React.useState("");

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const query = useQuery({
    queryKey: [...queryKeys.wishlist.all, "page", debouncedQ, sort],
    queryFn: async () => {
      const result = await getWishlistListingsAction({
        q: debouncedQ,
        sort,
      });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    initialData:
      debouncedQ === "" && sort === "recent" ? initialItems : undefined,
    staleTime: 30_000,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });

  const items = query.data ?? initialItems;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="wishlist-q" className="text-sm font-medium">
            Search saved
          </label>
          <Input
            id="wishlist-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, city, or area"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5 sm:w-48">
          <label htmlFor="wishlist-sort" className="text-sm font-medium">
            Sort
          </label>
          <select
            id="wishlist-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as WishlistSort)}
            className="border-input bg-card h-11 w-full rounded-xl border px-3 text-sm"
          >
            <option value="recent">Recently added</option>
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border-border/80 bg-card flex flex-col items-center rounded-2xl border px-6 py-12 text-center shadow-[var(--rp-shadow-xs)]">
          <div className="bg-brand-blue-soft text-brand-blue mb-4 flex size-14 items-center justify-center rounded-full">
            <Heart className="size-6" aria-hidden />
          </div>
          <p className="text-base font-semibold">No saved listings yet</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Tap the heart on any listing card to save it for later.
          </p>
          <Link
            href="/search"
            className={cn(buttonVariants({ size: "lg" }), "mt-6")}
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <ListingGrid listings={items} isAuthenticated />
      )}
    </div>
  );
}
