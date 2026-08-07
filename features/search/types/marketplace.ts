import type {
  DepositType,
  RentPriceUnit,
  VerificationBadgeStatus,
} from "@prisma/client";

import type { PublicLocationPrecision } from "@/lib/geo/coordinates";

export type PublicListingCardView = {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  city: string;
  area: string;
  rentPriceAmount: number;
  rentPriceUnit: RentPriceUnit;
  currency: string;
  coverImageUrl: string | null;
  imageCount: number;
  sellerRating: number;
  sellerRatingCount: number;
  sellerCompletedRentals: number;
  sellerResponseMinutes: number | null;
  verificationBadge: VerificationBadgeStatus;
  isWishlisted: boolean;
  availabilityLabel: "Available" | "Limited" | "Check dates" | "Unavailable";
  publishedAt: string | null;
  /** Public map coordinates (privacy-aware). */
  lat: number;
  lng: number;
  locationPrecision: PublicLocationPrecision;
  /** Server-computed from true coords; null when no viewer location. */
  distanceKm: number | null;
  status: "ACTIVE" | "INACTIVE";
};

export type CategoryBrowseItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  listingCount: number;
};

export type SellerCardView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avgRating: number;
  ratingCount: number;
  completedRentalsCount: number;
  memberSince: string;
  verificationBadge: VerificationBadgeStatus;
  responseTimeMinutesAvg: number | null;
  city: string | null;
};

export type PublicListingDetailView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  sellerId: string;
  rentPriceAmount: number;
  rentPriceUnit: RentPriceUnit;
  currency: string;
  depositType: DepositType;
  depositAmount: number | null;
  depositPercent: number | null;
  city: string;
  area: string;
  countryCode: string;
  /** Public coords — exact only when owner or showExactPickup. */
  lat: number;
  lng: number;
  locationPrecision: PublicLocationPrecision;
  showExactPickup: boolean;
  viewCount: number;
  publishedAt: string | null;
  isWishlisted: boolean;
  distanceKm: number | null;
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
  }>;
  availability: Array<{
    id: string;
    type: "AVAILABLE" | "BLOCKED";
    startDate: string;
    endDate: string;
    notes: string | null;
  }>;
  seller: SellerCardView;
};

export type TopSellerView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avgRating: number;
  ratingCount: number;
  completedRentalsCount: number;
  verificationBadge: VerificationBadgeStatus;
  city: string | null;
  activeListingCount: number;
};

export type SearchListingsResult = {
  items: PublicListingCardView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
