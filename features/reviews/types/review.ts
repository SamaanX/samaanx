import type { AppMode, VerificationBadgeStatus } from "@prisma/client";

import type {
  RatingBreakdown,
  SellerLevel,
  TrustBadge,
} from "@/features/trust/lib/seller-level";

export type TrustActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL";
};

export type TrustActionResult<T> =
  { ok: true; data: T } | { ok: false; error: TrustActionError };

export type ReviewCardView = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  rentalStartDate: string;
  rentalEndDate: string;
  listingTitle: string;
  reviewer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type PublicProfileView = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  area: string | null;
  preferredMode: AppMode;
  verificationBadge: VerificationBadgeStatus;
  memberSince: string;
  avgRating: number;
  ratingCount: number;
  completedRentalsCount: number;
  responseTimeMinutesAvg: number | null;
  cancellationRate: number;
  activeListingsCount: number;
  level: SellerLevel;
  badges: TrustBadge[];
  ratingBreakdown: RatingBreakdown;
  reviews: ReviewCardView[];
  activeListings: Array<{
    id: string;
    slug: string;
    title: string;
    city: string;
    area: string;
    rentPriceAmount: number;
    rentPriceUnit: string;
    currency: string;
    coverImageUrl: string | null;
    avgRating: number;
  }>;
};

export type ReviewEligibleRental = {
  rentalId: string;
  listingTitle: string;
  listingSlug: string;
  revieweeId: string;
  revieweeName: string;
  revieweeAvatarUrl: string | null;
  role: "buyer" | "seller";
  startDate: string;
  endDate: string;
  alreadyReviewed: boolean;
};
