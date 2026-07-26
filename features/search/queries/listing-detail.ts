import { cache } from "react";

import { toPublicListingDetailView } from "@/features/search/services/mappers";
import type { PublicListingDetailView } from "@/features/search/types/marketplace";
import { prisma } from "@/lib/db/prisma";
import { withPerf } from "@/lib/perf";

type ListingDetailOptions = {
  viewerUserId?: string | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
};

/**
 * Raw listing fetch cached by slug (exact coords stay server-side).
 * Privacy mapping is applied per-request via options (owner vs public).
 */
const getListingDetailRawBySlug = cache(async (slug: string) => {
  return withPerf("listing.detail", async () => {
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
  });
});

export async function getPublicListingBySlug(
  slug: string,
  options: ListingDetailOptions = {},
): Promise<PublicListingDetailView | null> {
  const listing = await getListingDetailRawBySlug(slug);
  if (!listing) return null;

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

/** True coords for nearby ranking — same React cache as detail (no extra query). */
export async function getListingOriginCoords(
  slug: string,
): Promise<{ id: string; lat: number; lng: number } | null> {
  const listing = await getListingDetailRawBySlug(slug);
  if (!listing) return null;
  return { id: listing.id, lat: listing.lat, lng: listing.lng };
}

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
