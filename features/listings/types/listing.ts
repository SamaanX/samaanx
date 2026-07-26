import type {
  AvailabilityType,
  DepositType,
  ListingStatus,
  RentPriceUnit,
} from "@prisma/client";

export type ListingActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL";
};

export type ListingActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ListingActionError };

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
};

export type ListingImageView = {
  id: string;
  storagePath: string;
  url: string;
  sortOrder: number;
  byteSize: number | null;
};

export type ListingAvailabilityView = {
  id: string;
  type: AvailabilityType;
  startDate: string;
  endDate: string;
  notes: string | null;
};

export type SellerListingCardView = {
  id: string;
  title: string;
  status: ListingStatus;
  rentPriceAmount: number;
  rentPriceUnit: RentPriceUnit;
  currency: string;
  city: string;
  area: string;
  viewCount: number;
  requestCount: number;
  createdAt: string;
  publishedAt: string | null;
  categoryName: string;
  coverImageUrl: string | null;
};

export type SellerListingDetailView = {
  id: string;
  title: string;
  description: string;
  status: ListingStatus;
  categoryId: string;
  rentPriceAmount: number;
  rentPriceUnit: RentPriceUnit;
  currency: string;
  depositType: DepositType;
  depositAmount: number | null;
  depositPercent: number | null;
  city: string;
  area: string;
  countryCode: string;
  lat: number;
  lng: number;
  showExactPickup: boolean;
  viewCount: number;
  requestCount: number;
  createdAt: string;
  publishedAt: string | null;
  images: ListingImageView[];
  availability: ListingAvailabilityView[];
};
