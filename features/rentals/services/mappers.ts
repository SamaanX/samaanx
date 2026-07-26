import type {
  Conversation,
  Listing,
  ListingImage,
  Profile,
  Rental,
  RentalStatus,
} from "@prisma/client";

import { estimateRentalCost, toDateOnlyString } from "@/domain/rental";
import type { RentalCardView } from "@/features/rentals/types/rental";

type RentalWithRelations = {
  id: string;
  status: RentalStatus;
  startDate: Date;
  endDate: Date;
  messageToSeller: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  currency: string;
  rentPriceAmount: Rental["rentPriceAmount"];
  rentPriceUnit: Rental["rentPriceUnit"];
  depositType: Rental["depositType"];
  depositAmount: Rental["depositAmount"];
  depositPercent: Rental["depositPercent"];
  createdAt: Date;
  approvedAt: Date | null;
  listing: Pick<Listing, "id" | "slug" | "title" | "city"> & {
    images: Pick<ListingImage, "url" | "sortOrder">[];
  };
  buyer: Pick<Profile, "id" | "displayName" | "avatarUrl">;
  seller: Pick<Profile, "id" | "displayName" | "avatarUrl">;
  conversation: Pick<Conversation, "id" | "isReadonly"> | null;
};

export function currentStepForStatus(status: RentalStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Waiting for seller approval";
    case "APPROVED":
      return "Approved — open handover to verify";
    case "HANDOVER_PENDING":
      return "Handover pending — verify QR or PIN";
    case "ACTIVE":
      return "Rental in progress — tap Return Item when ready";
    case "RETURN_PENDING":
      return "Return in progress — verify codes, then both confirm";
    case "COMPLETED":
      return "Completed — leave a review";
    case "REJECTED":
      return "Rejected by seller";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "DISPUTED":
      return "Disputed";
    default:
      return status;
  }
}

export function toRentalCardView(rental: RentalWithRelations): RentalCardView {
  const startDate = toDateOnlyString(rental.startDate);
  const endDate = toDateOnlyString(rental.endDate);
  const rentPriceAmount = Number(rental.rentPriceAmount);
  const depositAmount =
    rental.depositAmount === null ? null : Number(rental.depositAmount);
  const depositPercent =
    rental.depositPercent === null ? null : Number(rental.depositPercent);

  const estimate = estimateRentalCost({
    startDate,
    endDate,
    rentPriceAmount,
    rentPriceUnit: rental.rentPriceUnit,
    depositType: rental.depositType,
    depositAmount,
    depositPercent,
  });

  const cover = [...rental.listing.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];

  return {
    id: rental.id,
    status: rental.status,
    startDate,
    endDate,
    messageToSeller: rental.messageToSeller,
    rejectionReason: rental.rejectionReason,
    cancellationReason: rental.cancellationReason,
    currency: rental.currency,
    rentPriceAmount,
    rentPriceUnit: rental.rentPriceUnit,
    depositType: rental.depositType,
    depositAmount,
    depositPercent,
    estimatedRent: estimate.rentSubtotal,
    estimatedDeposit: estimate.depositAmount,
    estimatedTotal: estimate.estimatedTotal,
    durationDays: estimate.durationDays,
    createdAt: rental.createdAt.toISOString(),
    approvedAt: rental.approvedAt?.toISOString() ?? null,
    listing: {
      id: rental.listing.id,
      slug: rental.listing.slug,
      title: rental.listing.title,
      coverImageUrl: cover?.url ?? null,
      city: rental.listing.city,
    },
    buyer: {
      id: rental.buyer.id,
      displayName: rental.buyer.displayName,
      avatarUrl: rental.buyer.avatarUrl,
    },
    seller: {
      id: rental.seller.id,
      displayName: rental.seller.displayName,
      avatarUrl: rental.seller.avatarUrl,
    },
    conversationId: rental.conversation?.id ?? null,
    conversationReadonly: rental.conversation?.isReadonly ?? false,
    currentStep: currentStepForStatus(rental.status),
  };
}

export function groupRentalsByTab(rentals: RentalCardView[]): {
  pending: RentalCardView[];
  approved: RentalCardView[];
  rejected: RentalCardView[];
  cancelled: RentalCardView[];
  completed: RentalCardView[];
  active: RentalCardView[];
} {
  const pending: RentalCardView[] = [];
  const approved: RentalCardView[] = [];
  const rejected: RentalCardView[] = [];
  const cancelled: RentalCardView[] = [];
  const completed: RentalCardView[] = [];
  const active: RentalCardView[] = [];

  for (const rental of rentals) {
    switch (rental.status) {
      case "REQUESTED":
        pending.push(rental);
        break;
      case "APPROVED":
      case "HANDOVER_PENDING":
        approved.push(rental);
        break;
      case "ACTIVE":
      case "RETURN_PENDING":
        active.push(rental);
        break;
      case "REJECTED":
        rejected.push(rental);
        break;
      case "CANCELLED":
      case "EXPIRED":
        cancelled.push(rental);
        break;
      case "COMPLETED":
        completed.push(rental);
        break;
      case "DISPUTED":
        approved.push(rental);
        break;
      default:
        pending.push(rental);
    }
  }

  return { pending, approved, rejected, cancelled, completed, active };
}
