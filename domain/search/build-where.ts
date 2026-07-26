import type { Prisma } from "@prisma/client";

import type { MarketplaceSearchFilters } from "@/domain/search/types";
import { boundingBox } from "@/lib/geo/coordinates";

function dateOnlyToUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Prisma `where` for public ACTIVE catalog, plus optional search filters.
 * Nearby uses bbox prefilter; Haversine ranking happens in the query layer.
 */
export function buildPublicListingWhere(
  filters: MarketplaceSearchFilters,
): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [
    { status: "ACTIVE" },
    { deletedAt: null },
    {
      seller: {
        status: "ACTIVE",
        deletedAt: null,
      },
    },
  ];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } },
        { area: { contains: filters.q, mode: "insensitive" } },
        { category: { name: { contains: filters.q, mode: "insensitive" } } },
        {
          seller: {
            displayName: { contains: filters.q, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (filters.categorySlug) {
    and.push({
      category: {
        slug: filters.categorySlug,
        isActive: true,
      },
    });
  }

  if (filters.city) {
    and.push({ city: { equals: filters.city, mode: "insensitive" } });
  }

  if (filters.area) {
    and.push({ area: { contains: filters.area, mode: "insensitive" } });
  }

  if (filters.priceMin !== null) {
    and.push({ rentPriceAmount: { gte: filters.priceMin } });
  }

  if (filters.priceMax !== null) {
    and.push({ rentPriceAmount: { lte: filters.priceMax } });
  }

  if (filters.rentUnit) {
    and.push({ rentPriceUnit: filters.rentUnit });
  }

  if (filters.depositType === "REQUIRED") {
    and.push({ depositType: { not: "NONE" } });
  } else if (filters.depositType) {
    and.push({ depositType: filters.depositType });
  }

  if (filters.ratingMin !== null) {
    and.push({
      seller: {
        avgRating: { gte: filters.ratingMin },
      },
    });
  }

  if (filters.verifiedSellerOnly) {
    and.push({
      seller: {
        verificationBadge: "VERIFIED",
      },
    });
  }

  if (
    filters.nearLat !== null &&
    filters.nearLng !== null &&
    (filters.radiusKm !== null || filters.sort === "nearest")
  ) {
    const radius = filters.radiusKm ?? 25;
    const box = boundingBox(
      { lat: filters.nearLat, lng: filters.nearLng },
      radius,
    );
    and.push({
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    });
  }

  if (filters.availableFrom && filters.availableTo) {
    const from = dateOnlyToUtc(filters.availableFrom);
    const to = dateOnlyToUtc(filters.availableTo);
    and.push({
      AND: [
        {
          availability: {
            some: {
              type: "AVAILABLE",
              startDate: { lte: from },
              endDate: { gte: to },
            },
          },
        },
        {
          availability: {
            none: {
              type: "BLOCKED",
              startDate: { lte: to },
              endDate: { gte: from },
            },
          },
        },
      ],
    });
  } else if (filters.availableFrom) {
    const from = dateOnlyToUtc(filters.availableFrom);
    and.push({
      availability: {
        some: {
          type: "AVAILABLE",
          startDate: { lte: from },
          endDate: { gte: from },
        },
      },
    });
  }

  return { AND: and };
}

export function buildPublicListingOrderBy(
  sort: MarketplaceSearchFilters["sort"],
): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ rentPriceAmount: "asc" }, { publishedAt: "desc" }];
    case "price_desc":
      return [{ rentPriceAmount: "desc" }, { publishedAt: "desc" }];
    case "popular":
      return [
        { viewCount: "desc" },
        { requestCount: "desc" },
        { publishedAt: "desc" },
      ];
    case "highest_rated_seller":
      return [
        { seller: { avgRating: "desc" } },
        { seller: { ratingCount: "desc" } },
        { publishedAt: "desc" },
      ];
    case "nearest":
      // Distance applied in searchPublicListings after bbox fetch.
      return [{ publishedAt: "desc" }];
    case "recently_added":
    case "newest":
    default:
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
  }
}
