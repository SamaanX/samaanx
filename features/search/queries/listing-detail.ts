import { unstable_cache } from "next/cache";
import { cache } from "react";

import { toPublicListingDetailView } from "@/features/search/services/mappers";
import type { PublicListingDetailView } from "@/features/search/types/marketplace";
import { prisma } from "@/lib/db/prisma";
import { withPerf } from "@/lib/perf";

const LISTING_DETAIL_REVALIDATE_SECONDS = 60;

type ListingDetailOptions = {
  viewerUserId?: string | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
};

type ListingDetailRaw = NonNullable<
  Awaited<ReturnType<typeof fetchListingDetailRaw>>
>;

async function fetchListingDetailRaw(slug: string) {
  return prisma.listing.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      deletedAt: null,
      seller: { status: "ACTIVE", deletedAt: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      sellerId: true,
      rentPriceAmount: true,
      rentPriceUnit: true,
      currency: true,
      depositType: true,
      depositAmount: true,
      depositPercent: true,
      city: true,
      area: true,
      countryCode: true,
      lat: true,
      lng: true,
      showExactPickup: true,
      viewCount: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      images: {
        select: { id: true, url: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
        take: 16,
      },
      availability: {
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          notes: true,
        },
        orderBy: { startDate: "asc" },
        take: 24,
      },
      seller: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          avgRating: true,
          ratingCount: true,
          completedRentalsCount: true,
          memberSince: true,
          verificationBadge: true,
          responseTimeMinutesAvg: true,
          city: true,
        },
      },
    },
  });
}

const getCachedListingDetailRawBySlug = unstable_cache(
  async (slug: string) => {
    return withPerf("listing.detail", () => fetchListingDetailRaw(slug));
  },
  ["listing-detail-raw"],
  {
    revalidate: LISTING_DETAIL_REVALIDATE_SECONDS,
    tags: ["listing-detail"],
  },
);

/** Per-request dedupe on top of cross-request cache. */
const getListingDetailRawBySlug = cache(async (slug: string) => {
  return getCachedListingDetailRawBySlug(slug);
});

export function mapRawListingToPublicView(
  listing: ListingDetailRaw,
  options: ListingDetailOptions = {},
): PublicListingDetailView {
  const isOwner = Boolean(
    options.viewerUserId && options.viewerUserId === listing.sellerId,
  );

  return toPublicListingDetailView(
    { ...listing, wishlists: [] },
    {
      isOwner,
      viewerLat: options.viewerLat,
      viewerLng: options.viewerLng,
    },
  );
}

export async function getPublicListingBySlug(
  slug: string,
  options: ListingDetailOptions = {},
): Promise<PublicListingDetailView | null> {
  const listing = await getListingDetailRawBySlug(slug);
  if (!listing) return null;
  return mapRawListingToPublicView(listing, options);
}

/** True coords for nearby ranking — uses cached raw row (no extra query). */
export async function getListingOriginCoords(
  slug: string,
): Promise<{ id: string; lat: number; lng: number } | null> {
  const listing = await getListingDetailRawBySlug(slug);
  if (!listing) return null;
  return { id: listing.id, lat: listing.lat, lng: listing.lng };
}

export { getListingDetailRawBySlug };

/** @deprecated Prefer getPublicListingBySlug(slug, options) — kept for call-site compat. */
export const getPublicListingBySlugCached = cache(
  async (slug: string): Promise<PublicListingDetailView | null> => {
    return getPublicListingBySlug(slug);
  },
);

export async function isListingWishlisted(
  listingId: string,
  userId: string,
): Promise<boolean> {
  const row = await prisma.wishlist.findUnique({
    where: {
      userId_listingId: { userId, listingId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Fire-and-forget view increment — does not block page render. */
export async function incrementListingViewCount(
  listingId: string,
): Promise<void> {
  await prisma.listing.update({
    where: { id: listingId },
    data: { viewCount: { increment: 1 } },
  });
}
