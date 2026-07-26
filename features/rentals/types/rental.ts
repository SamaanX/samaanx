import type { RentalStatus } from "@prisma/client";

export type RentalActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL";
};

export type RentalActionResult<T> =
  { ok: true; data: T } | { ok: false; error: RentalActionError };

export type RentalPartyPreview = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type RentalListingPreview = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  city: string;
};

export type RentalCardView = {
  id: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  messageToSeller: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  currency: string;
  rentPriceAmount: number;
  rentPriceUnit: "DAY" | "WEEK" | "MONTH";
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositAmount: number | null;
  depositPercent: number | null;
  estimatedRent: number;
  estimatedDeposit: number;
  estimatedTotal: number;
  durationDays: number;
  createdAt: string;
  approvedAt: string | null;
  listing: RentalListingPreview;
  buyer: RentalPartyPreview;
  seller: RentalPartyPreview;
  conversationId: string | null;
  conversationReadonly: boolean;
  currentStep: string;
};

export type BuyerRentalsGrouped = {
  pending: RentalCardView[];
  approved: RentalCardView[];
  rejected: RentalCardView[];
  cancelled: RentalCardView[];
  completed: RentalCardView[];
  active: RentalCardView[];
};

export type SellerRentalsGrouped = BuyerRentalsGrouped;
