import type {
  Category,
  Listing,
  ListingAvailability,
  ListingImage,
  Profile,
  VerificationBadgeStatus,
} from "@prisma/client";

import type {
  CategoryBrowseItem,
  PublicListingCardView,
  PublicListingDetailView,
  SellerCardView,
  TopSellerView,
} from "@/features/search/types/marketplace";
import { haversineKm, resolvePublicCoordinates } from "@/lib/geo/coordinates";

type CardListing = {
  id: string;
  slug: string;
  title: string;
  city: string;
  area: string;
  rentPriceAmount: Listing["rentPriceAmount"];
  rentPriceUnit: Listing["rentPriceUnit"];
  currency: string;
  publishedAt: Date | null;
  lat?: number;
  lng?: number;
  showExactPickup?: boolean;
  status?: Listing["status"];
  category: Pick<Category, "name" | "slug">;
  images: Pick<ListingImage, "url" | "sortOrder">[];
  _count: { images: number };
  seller: Pick<
    Profile,
    | "avgRating"
    | "ratingCount"
    | "verificationBadge"
    | "completedRentalsCount"
    | "responseTimeMinutesAvg"
  >;
  availability: Pick<ListingAvailability, "type" | "startDate" | "endDate">[];
  wishlists?: { id: string }[];
};

type DetailListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sellerId: string;
  rentPriceAmount: Listing["rentPriceAmount"];
  rentPriceUnit: Listing["rentPriceUnit"];
  currency: string;
  depositType: Listing["depositType"];
  depositAmount: Listing["depositAmount"];
  depositPercent: Listing["depositPercent"];
  city: string;
  area: string;
  countryCode: string;
  lat: number;
  lng: number;
  showExactPickup: boolean;
  viewCount: number;
  publishedAt: Date | null;
  category: Pick<Category, "id" | "name" | "slug">;
  images: Pick<ListingImage, "id" | "url" | "sortOrder">[];
  availability: Pick<
    ListingAvailability,
    "id" | "type" | "startDate" | "endDate" | "notes"
  >[];
  seller: Pick<
    Profile,
    | "id"
    | "displayName"
    | "avatarUrl"
    | "avgRating"
    | "ratingCount"
    | "completedRentalsCount"
    | "memberSince"
    | "verificationBadge"
    | "responseTimeMinutesAvg"
    | "city"
  >;
  wishlists?: { id: string }[];
};

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateOnly(value: Date | string): string {
  return coerceDate(value).toISOString().slice(0, 10);
}

function todayUtcDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function resolveAvailabilityLabel(
  rows: Pick<ListingAvailability, "type" | "startDate" | "endDate">[],
): PublicListingCardView["availabilityLabel"] {
  const today = todayUtcDateOnly();
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  const blockedToday = rows.some(
    (row) =>
      row.type === "BLOCKED" &&
      coerceDate(row.startDate) <= todayDate &&
      coerceDate(row.endDate) >= todayDate,
  );
  if (blockedToday) {
    return "Limited";
  }

  const availableToday = rows.some(
    (row) =>
      row.type === "AVAILABLE" &&
      coerceDate(row.startDate) <= todayDate &&
      coerceDate(row.endDate) >= todayDate,
  );
  if (availableToday) {
    return "Available";
  }

  const hasFutureAvailable = rows.some(
    (row) => row.type === "AVAILABLE" && coerceDate(row.endDate) >= todayDate,
  );
  return hasFutureAvailable ? "Limited" : "Check dates";
}

export function toPublicListingCardView(
  listing: CardListing,
  options?: {
    viewerLat?: number | null;
    viewerLng?: number | null;
    distanceKm?: number | null;
  },
): PublicListingCardView {
  const cover = [...listing.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];

  let distanceKm = options?.distanceKm ?? null;
  if (
    distanceKm == null &&
    options?.viewerLat != null &&
    options?.viewerLng != null &&
    typeof listing.lat === "number" &&
    typeof listing.lng === "number"
  ) {
    distanceKm = haversineKm(
      { lat: options.viewerLat, lng: options.viewerLng },
      { lat: listing.lat, lng: listing.lng },
    );
  }

  let mapLat = 0;
  let mapLng = 0;
  let locationPrecision: PublicListingCardView["locationPrecision"] =
    "approximate";

  if (typeof listing.lat === "number" && typeof listing.lng === "number") {
    const publicCoords = resolvePublicCoordinates({
      lat: listing.lat,
      lng: listing.lng,
      listingId: listing.id,
      showExactPickup: listing.showExactPickup ?? false,
      isOwner: false,
    });
    mapLat = publicCoords.lat;
    mapLng = publicCoords.lng;
    locationPrecision = publicCoords.precision;
  }

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    categoryName: listing.category.name,
    categorySlug: listing.category.slug,
    city: listing.city,
    area: listing.area,
    lat: mapLat,
    lng: mapLng,
    locationPrecision,
    rentPriceAmount: Number(listing.rentPriceAmount),
    rentPriceUnit: listing.rentPriceUnit,
    currency: listing.currency,
    coverImageUrl: cover?.url ?? null,
    imageCount: listing._count.images,
    sellerRating: Number(listing.seller.avgRating),
    sellerRatingCount: listing.seller.ratingCount,
    sellerCompletedRentals: listing.seller.completedRentalsCount,
    sellerResponseMinutes: listing.seller.responseTimeMinutesAvg,
    verificationBadge: listing.seller.verificationBadge,
    isWishlisted: Boolean(listing.wishlists && listing.wishlists.length > 0),
    availabilityLabel: resolveAvailabilityLabel(listing.availability),
    publishedAt: listing.publishedAt
      ? coerceDate(listing.publishedAt).toISOString()
      : null,
    distanceKm:
      distanceKm !== null && Number.isFinite(distanceKm)
        ? Math.round(distanceKm * 10) / 10
        : null,
    status: listing.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
  };
}

export function toSellerCardView(
  seller: Pick<
    Profile,
    | "id"
    | "displayName"
    | "avatarUrl"
    | "avgRating"
    | "ratingCount"
    | "completedRentalsCount"
    | "memberSince"
    | "verificationBadge"
    | "responseTimeMinutesAvg"
    | "city"
  >,
): SellerCardView {
  return {
    id: seller.id,
    displayName: seller.displayName,
    avatarUrl: seller.avatarUrl,
    avgRating: Number(seller.avgRating),
    ratingCount: seller.ratingCount,
    completedRentalsCount: seller.completedRentalsCount,
    memberSince: coerceDate(seller.memberSince).toISOString(),
    verificationBadge: seller.verificationBadge,
    responseTimeMinutesAvg: seller.responseTimeMinutesAvg,
    city: seller.city,
  };
}

export function toPublicListingDetailView(
  listing: DetailListing,
  options?: {
    isOwner?: boolean;
    viewerLat?: number | null;
    viewerLng?: number | null;
  },
): PublicListingDetailView {
  const isOwner = Boolean(options?.isOwner);
  const publicCoords = resolvePublicCoordinates({
    lat: listing.lat,
    lng: listing.lng,
    listingId: listing.id,
    showExactPickup: listing.showExactPickup,
    isOwner,
  });

  let distanceKm: number | null = null;
  if (options?.viewerLat != null && options?.viewerLng != null) {
    distanceKm =
      Math.round(
        haversineKm(
          { lat: options.viewerLat, lng: options.viewerLng },
          { lat: listing.lat, lng: listing.lng },
        ) * 10,
      ) / 10;
  }

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    categoryId: listing.category.id,
    categoryName: listing.category.name,
    categorySlug: listing.category.slug,
    sellerId: listing.sellerId,
    rentPriceAmount: Number(listing.rentPriceAmount),
    rentPriceUnit: listing.rentPriceUnit,
    currency: listing.currency,
    depositType: listing.depositType,
    depositAmount:
      listing.depositAmount === null ? null : Number(listing.depositAmount),
    depositPercent:
      listing.depositPercent === null ? null : Number(listing.depositPercent),
    city: listing.city,
    area: listing.area,
    countryCode: listing.countryCode,
    lat: publicCoords.lat,
    lng: publicCoords.lng,
    locationPrecision: publicCoords.precision,
    showExactPickup: listing.showExactPickup,
    viewCount: listing.viewCount,
    publishedAt: listing.publishedAt
      ? coerceDate(listing.publishedAt).toISOString()
      : null,
    isWishlisted: Boolean(listing.wishlists && listing.wishlists.length > 0),
    distanceKm,
    images: [...listing.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        url: image.url,
        sortOrder: image.sortOrder,
      })),
    availability: [...listing.availability]
      .sort(
        (a, b) =>
          coerceDate(a.startDate).getTime() - coerceDate(b.startDate).getTime(),
      )
      .map((row) => ({
        id: row.id,
        type: row.type,
        startDate: toDateOnly(row.startDate),
        endDate: toDateOnly(row.endDate),
        notes: row.notes,
      })),
    seller: toSellerCardView(listing.seller),
  };
}

export function toCategoryBrowseItem(
  category: Category & { _count: { listings: number } },
): CategoryBrowseItem {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    sortOrder: category.sortOrder,
    listingCount: category._count.listings,
  };
}

export function toTopSellerView(seller: {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avgRating: Profile["avgRating"];
  ratingCount: number;
  completedRentalsCount: number;
  verificationBadge: VerificationBadgeStatus;
  city: string | null;
  _count: { listingsOwned: number };
}): TopSellerView {
  return {
    id: seller.id,
    displayName: seller.displayName,
    avatarUrl: seller.avatarUrl,
    avgRating: Number(seller.avgRating),
    ratingCount: seller.ratingCount,
    completedRentalsCount: seller.completedRentalsCount,
    verificationBadge: seller.verificationBadge as VerificationBadgeStatus,
    city: seller.city,
    activeListingCount: seller._count.listingsOwned,
  };
}
