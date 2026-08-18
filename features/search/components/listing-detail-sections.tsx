import { Suspense } from "react";

import { ListingGrid } from "@/features/search/components/listing-grid";
import { ListingGridSkeleton } from "@/features/search/components/skeletons";
import {
  getNearbyListings,
  getRelatedListings,
} from "@/features/search/queries/catalog";

type ListingRelatedSectionProps = {
  listingId: string;
  categoryId: string;
  isAuthenticated: boolean;
  viewerUserId: string | null;
};

export async function ListingRelatedSection({
  listingId,
  categoryId,
  isAuthenticated,
  viewerUserId,
}: ListingRelatedSectionProps) {
  const related = await getRelatedListings(
    listingId,
    categoryId,
    4,
    viewerUserId,
  );
  if (related.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      <h2 className="text-xl font-semibold tracking-tight">Similar listings</h2>
      <ListingGrid
        listings={related}
        isAuthenticated={isAuthenticated}
        animated={false}
      />
    </section>
  );
}

type ListingNearbySectionProps = {
  listingId: string;
  lat: number;
  lng: number;
  isAuthenticated: boolean;
  viewerUserId: string | null;
};

export async function ListingNearbySection({
  listingId,
  lat,
  lng,
  isAuthenticated,
  viewerUserId,
}: ListingNearbySectionProps) {
  const nearby = await getNearbyListings({
    listingId,
    lat,
    lng,
    radiusKm: 10,
    take: 4,
    wishlistUserId: viewerUserId,
  });
  if (nearby.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      <h2 className="text-xl font-semibold tracking-tight">
        Nearby alternatives
      </h2>
      <ListingGrid
        listings={nearby}
        isAuthenticated={isAuthenticated}
        animated={false}
      />
    </section>
  );
}

export function ListingRelatedSectionSkeleton() {
  return (
    <section className="space-y-4 pt-2">
      <div className="bg-muted h-7 w-40 animate-pulse rounded" />
      <ListingGridSkeleton count={4} />
    </section>
  );
}

export function ListingNearbySectionSkeleton() {
  return (
    <section className="space-y-4 pt-2">
      <div className="bg-muted h-7 w-44 animate-pulse rounded" />
      <ListingGridSkeleton count={4} />
    </section>
  );
}

export function DeferredListingRelatedSection(
  props: ListingRelatedSectionProps,
) {
  return (
    <Suspense fallback={<ListingRelatedSectionSkeleton />}>
      <ListingRelatedSection {...props} />
    </Suspense>
  );
}

export function DeferredListingNearbySection(props: ListingNearbySectionProps) {
  return (
    <Suspense fallback={<ListingNearbySectionSkeleton />}>
      <ListingNearbySection {...props} />
    </Suspense>
  );
}
