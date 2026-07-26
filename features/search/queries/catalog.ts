import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  buildPublicListingOrderBy,
  buildPublicListingWhere,
  type MarketplaceSearchFilters,
} from "@/domain/search";
import {
  toCategoryBrowseItem,
  toPublicListingCardView,
  toTopSellerView,
} from "@/features/search/services/mappers";
import type {
  CategoryBrowseItem,
  PublicListingCardView,
  SearchListingsResult,
  TopSellerView,
} from "@/features/search/types/marketplace";
import { prisma } from "@/lib/db/prisma";
import { boundingBox, haversineKm } from "@/lib/geo/coordinates";

/** Categories rarely change — long TTL. */
const CATEGORIES_REVALIDATE_SECONDS = 300;
/** Home listing rails — short TTL keeps freshness without every-nav DB tax. */
const HOME_LISTINGS_REVALIDATE_SECONDS = 45;
/** Top sellers — short TTL. */
const TOP_SELLERS_REVALIDATE_SECONDS = 60;

async function applyWishlistFlags(
  listings: PublicListingCardView[],
  wishlistUserId: string | null,
): Promise<PublicListingCardView[]> {
  if (!wishlistUserId || listings.length === 0) {
    return listings.map((listing) => ({ ...listing, isWishlisted: false }));
  }

  const wishlisted = await prisma.wishlist.findMany({
    where: {
      userId: wishlistUserId,
      listingId: { in: listings.map((listing) => listing.id) },
    },
    select: { listingId: true },
  });
  const wishlistedIds = new Set(wishlisted.map((row) => row.listingId));

  return listings.map((listing) => ({
    ...listing,
    isWishlisted: wishlistedIds.has(listing.id),
  }));
}

function cardSelect(wishlistUserId: string | null) {
  return {
    id: true,
    slug: true,
    title: true,
    city: true,
    area: true,
    lat: true,
    lng: true,
    status: true,
    rentPriceAmount: true,
    rentPriceUnit: true,
    currency: true,
    publishedAt: true,
    category: { select: { name: true, slug: true } },
    images: {
      select: { url: true, sortOrder: true },
      orderBy: { sortOrder: "asc" as const },
      take: 1,
    },
    _count: { select: { images: true } },
    seller: {
      select: {
        avgRating: true,
        ratingCount: true,
        verificationBadge: true,
        completedRentalsCount: true,
        responseTimeMinutesAvg: true,
      },
    },
    availability: {
      select: { type: true, startDate: true, endDate: true },
      // Coarse card label only — keep payload tiny for Pakistan RTT.
      take: 4,
      orderBy: { startDate: "asc" as const },
    },
    ...(wishlistUserId
      ? {
          wishlists: {
            where: { userId: wishlistUserId },
            select: { id: true },
            take: 1,
          },
        }
      : {}),
  } as const;
}

const getCachedCategoriesWithCounts = unstable_cache(
  async (): Promise<CategoryBrowseItem[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            listings: {
              where: { status: "ACTIVE", deletedAt: null },
            },
          },
        },
      },
    });

    return categories.map(toCategoryBrowseItem);
  },
  ["home-categories-with-counts"],
  { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: ["categories"] },
);

export const getCategoriesWithCounts = cache(
  async (): Promise<CategoryBrowseItem[]> => getCachedCategoriesWithCounts(),
);

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryBrowseItem | null> {
  return getCategoryBySlugCached(slug);
}

const getCategoryBySlugCached = cache(
  async (slug: string): Promise<CategoryBrowseItem | null> => {
    const category = await prisma.category.findFirst({
      where: { slug, isActive: true },
      include: {
        _count: {
          select: {
            listings: {
              where: { status: "ACTIVE", deletedAt: null },
            },
          },
        },
      },
    });

    return category ? toCategoryBrowseItem(category) : null;
  },
);

export async function searchPublicListings(
  filters: MarketplaceSearchFilters,
  wishlistUserId: string | null = null,
): Promise<SearchListingsResult> {
  const where = buildPublicListingWhere(filters);
  const orderBy = buildPublicListingOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;
  const viewerLat = filters.nearLat;
  const viewerLng = filters.nearLng;
  const useNearest =
    filters.sort === "nearest" && viewerLat !== null && viewerLng !== null;

  // Nearest: bbox-prefilter (via where) → fetch capped candidates → Haversine sort → page.
  // Cap keeps work O(candidates), never full-table JS scans.
  if (useNearest) {
    const radiusKm = filters.radiusKm ?? 25;
    const candidateTake = Math.min(240, Math.max(80, filters.pageSize * 10));
    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      take: candidateTake,
      select: cardSelect(wishlistUserId),
    });

    const ranked = rows
      .map((row) => {
        const distanceKm = haversineKm(
          { lat: viewerLat, lng: viewerLng },
          { lat: row.lat, lng: row.lng },
        );
        return { row, distanceKm };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = ranked.length;
    const pageRows = ranked.slice(skip, skip + filters.pageSize);
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

    return {
      items: pageRows.map(({ row, distanceKm }) =>
        toPublicListingCardView(row, {
          viewerLat,
          viewerLng,
          distanceKm,
        }),
      ),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages,
    };
  }

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: filters.pageSize,
      select: cardSelect(wishlistUserId),
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items: rows.map((row) =>
      toPublicListingCardView(row, { viewerLat, viewerLng }),
    ),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

const getCachedRecentlyAddedListings = unstable_cache(
  async (take: number): Promise<PublicListingCardView[]> => {
    const rows = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        seller: { status: "ACTIVE", deletedAt: null },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: cardSelect(null),
    });

    return rows.map((row) => toPublicListingCardView(row));
  },
  ["home-recently-added"],
  { revalidate: HOME_LISTINGS_REVALIDATE_SECONDS, tags: ["home-catalog"] },
);

const getCachedPopularListings = unstable_cache(
  async (take: number): Promise<PublicListingCardView[]> => {
    const rows = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        seller: { status: "ACTIVE", deletedAt: null },
      },
      orderBy: [
        { viewCount: "desc" },
        { requestCount: "desc" },
        { publishedAt: "desc" },
      ],
      take,
      select: cardSelect(null),
    });

    return rows.map((row) => toPublicListingCardView(row));
  },
  ["home-popular"],
  { revalidate: HOME_LISTINGS_REVALIDATE_SECONDS, tags: ["home-catalog"] },
);

const getCachedHighestRatedSellerListings = unstable_cache(
  async (take: number): Promise<PublicListingCardView[]> => {
    const rows = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        seller: {
          status: "ACTIVE",
          deletedAt: null,
          ratingCount: { gt: 0 },
        },
      },
      orderBy: [
        { seller: { avgRating: "desc" } },
        { seller: { ratingCount: "desc" } },
        { publishedAt: "desc" },
      ],
      take,
      select: cardSelect(null),
    });

    return rows.map((row) => toPublicListingCardView(row));
  },
  ["home-highest-rated-seller"],
  { revalidate: HOME_LISTINGS_REVALIDATE_SECONDS, tags: ["home-catalog"] },
);

const getCachedTopSellers = unstable_cache(
  async (take: number): Promise<TopSellerView[]> => {
    const sellers = await prisma.profile.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ratingCount: { gt: 0 },
        listingsOwned: {
          some: { status: "ACTIVE", deletedAt: null },
        },
      },
      orderBy: [{ avgRating: "desc" }, { ratingCount: "desc" }],
      take,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        avgRating: true,
        ratingCount: true,
        completedRentalsCount: true,
        verificationBadge: true,
        city: true,
        _count: {
          select: {
            listingsOwned: {
              where: { status: "ACTIVE", deletedAt: null },
            },
          },
        },
      },
    });

    return sellers.map(toTopSellerView);
  },
  ["home-top-sellers"],
  { revalidate: TOP_SELLERS_REVALIDATE_SECONDS, tags: ["home-catalog"] },
);

export async function getRecentlyAddedListings(
  take = 8,
  wishlistUserId: string | null = null,
): Promise<PublicListingCardView[]> {
  const listings = await getCachedRecentlyAddedListings(take);
  return applyWishlistFlags(listings, wishlistUserId);
}

export async function getPopularListings(
  take = 8,
  wishlistUserId: string | null = null,
): Promise<PublicListingCardView[]> {
  const listings = await getCachedPopularListings(take);
  return applyWishlistFlags(listings, wishlistUserId);
}

export async function getHighestRatedSellerListings(
  take = 8,
  wishlistUserId: string | null = null,
): Promise<PublicListingCardView[]> {
  const listings = await getCachedHighestRatedSellerListings(take);
  return applyWishlistFlags(listings, wishlistUserId);
}

/** Home rails: 3 cached queries + one wishlist overlay. */
export async function getHomeListingRails(
  take = 8,
  wishlistUserId: string | null = null,
): Promise<{
  recentlyAdded: PublicListingCardView[];
  popular: PublicListingCardView[];
  highestRated: PublicListingCardView[];
}> {
  const [recentlyAdded, popular, highestRated] = await Promise.all([
    getCachedRecentlyAddedListings(take),
    getCachedPopularListings(take),
    getCachedHighestRatedSellerListings(take),
  ]);

  const wishlistedIds = new Set<string>();
  if (wishlistUserId) {
    const listingIds = [...recentlyAdded, ...popular, ...highestRated].map(
      (listing) => listing.id,
    );
    if (listingIds.length > 0) {
      const wishlisted = await prisma.wishlist.findMany({
        where: {
          userId: wishlistUserId,
          listingId: { in: [...new Set(listingIds)] },
        },
        select: { listingId: true },
      });
      for (const row of wishlisted) {
        wishlistedIds.add(row.listingId);
      }
    }
  }

  const withFlags = (listings: PublicListingCardView[]) =>
    listings.map((listing) => ({
      ...listing,
      isWishlisted: wishlistedIds.has(listing.id),
    }));

  return {
    recentlyAdded: withFlags(recentlyAdded),
    popular: withFlags(popular),
    highestRated: withFlags(highestRated),
  };
}

export async function getTopSellers(take = 6): Promise<TopSellerView[]> {
  return getCachedTopSellers(take);
}

const getCachedDistinctListingCities = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.listing.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    });

    return rows.map((row) => row.city);
  },
  ["listing-cities"],
  { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: ["home-catalog"] },
);

export async function getDistinctListingCities(): Promise<string[]> {
  return getCachedDistinctListingCities();
}

export async function getRelatedListings(
  listingId: string,
  categoryId: string,
  take = 4,
  wishlistUserId: string | null = null,
): Promise<PublicListingCardView[]> {
  const rows = await prisma.listing.findMany({
    where: {
      id: { not: listingId },
      categoryId,
      status: "ACTIVE",
      deletedAt: null,
      seller: { status: "ACTIVE", deletedAt: null },
    },
    orderBy: [{ publishedAt: "desc" }],
    take,
    select: cardSelect(wishlistUserId),
  });

  return rows.map((row) => toPublicListingCardView(row));
}

/** Nearby using true origin coords from DB (never trust public/fuzzed pins). */
export async function getNearbyListingsForListing(
  listingId: string,
  take = 4,
  wishlistUserId: string | null = null,
  radiusKm = 10,
): Promise<PublicListingCardView[]> {
  const origin = await prisma.listing.findFirst({
    where: { id: listingId, status: "ACTIVE", deletedAt: null },
    select: { lat: true, lng: true },
  });
  if (!origin) return [];
  return getNearbyListings({
    listingId,
    lat: origin.lat,
    lng: origin.lng,
    radiusKm,
    take,
    wishlistUserId,
  });
}

/**
 * Nearby alternatives — bbox + Haversine on a capped candidate set (no full-table scan).
 */
export async function getNearbyListings(params: {
  listingId: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  take?: number;
  wishlistUserId?: string | null;
}): Promise<PublicListingCardView[]> {
  const radiusKm = params.radiusKm ?? 10;
  const take = params.take ?? 4;
  const box = boundingBox({ lat: params.lat, lng: params.lng }, radiusKm);

  const rows = await prisma.listing.findMany({
    where: {
      id: { not: params.listingId },
      status: "ACTIVE",
      deletedAt: null,
      seller: { status: "ACTIVE", deletedAt: null },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    },
    take: Math.min(80, take * 12),
    select: cardSelect(params.wishlistUserId ?? null),
  });

  return rows
    .map((row) => {
      const distanceKm = haversineKm(
        { lat: params.lat, lng: params.lng },
        { lat: row.lat, lng: row.lng },
      );
      return { row, distanceKm };
    })
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, take)
    .map(({ row, distanceKm }) =>
      toPublicListingCardView(row, {
        viewerLat: params.lat,
        viewerLng: params.lng,
        distanceKm,
      }),
    );
}
