import { unstable_cache } from "next/cache";

import {
  toCategoryOption,
  toSellerListingCardView,
  toSellerListingDetailView,
} from "@/features/listings/services/listing-mappers";
import type {
  CategoryOption,
  SellerListingCardView,
  SellerListingDetailView,
} from "@/features/listings/types/listing";
import { prisma } from "@/lib/db/prisma";

const CATEGORIES_REVALIDATE_SECONDS = 300;

async function loadActiveCategories(): Promise<CategoryOption[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return categories.map(toCategoryOption);
}

/** Categories rarely change — cross-request cache. */
export const getActiveCategories = unstable_cache(
  loadActiveCategories,
  ["active-categories"],
  { revalidate: CATEGORIES_REVALIDATE_SECONDS, tags: ["categories"] },
);

export const SELLER_LISTINGS_PAGE_SIZE = 20;

const sellerListingCardSelect = {
  id: true,
  title: true,
  status: true,
  rentPriceAmount: true,
  rentPriceUnit: true,
  currency: true,
  city: true,
  area: true,
  viewCount: true,
  requestCount: true,
  createdAt: true,
  publishedAt: true,
  category: { select: { name: true } },
  images: {
    select: { url: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
} as const;

export async function getSellerListingsPage(
  sellerId: string,
  options: { cursor?: string | null; take?: number } = {},
): Promise<{ listings: SellerListingCardView[]; nextCursor: string | null }> {
  const take = options.take ?? SELLER_LISTINGS_PAGE_SIZE;

  const rows = await prisma.listing.findMany({
    where: {
      sellerId,
      deletedAt: null,
    },
    select: sellerListingCardSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    listings: page.map(toSellerListingCardView),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getSellerListings(
  sellerId: string,
): Promise<SellerListingCardView[]> {
  const { listings } = await getSellerListingsPage(sellerId);
  return listings;
}

export async function getSellerListingDetail(
  listingId: string,
  sellerId: string,
): Promise<SellerListingDetailView | null> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      sellerId,
      deletedAt: null,
    },
    select: {
      id: true,
      sellerId: true,
      categoryId: true,
      title: true,
      description: true,
      status: true,
      slug: true,
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
      requestCount: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      images: {
        select: {
          id: true,
          listingId: true,
          storagePath: true,
          url: true,
          sortOrder: true,
          byteSize: true,
          createdAt: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      availability: {
        select: {
          id: true,
          listingId: true,
          type: true,
          startDate: true,
          endDate: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!listing) {
    return null;
  }

  return toSellerListingDetailView(
    listing as Parameters<typeof toSellerListingDetailView>[0],
  );
}
