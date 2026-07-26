import {
  groupRentalsByTab,
  toRentalCardView,
} from "@/features/rentals/services/mappers";
import type {
  BuyerRentalsGrouped,
  RentalCardView,
  SellerRentalsGrouped,
} from "@/features/rentals/types/rental";
import { prisma } from "@/lib/db/prisma";

/** Soft cap — dashboards stay fast as history grows (UI groups tabs client-side). */
const RENTAL_DASHBOARD_TAKE = 80;

const rentalCardSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  messageToSeller: true,
  rejectionReason: true,
  cancellationReason: true,
  currency: true,
  rentPriceAmount: true,
  rentPriceUnit: true,
  depositType: true,
  depositAmount: true,
  depositPercent: true,
  createdAt: true,
  approvedAt: true,
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      images: {
        select: { url: true, sortOrder: true },
        orderBy: { sortOrder: "asc" as const },
        take: 1,
      },
    },
  },
  buyer: { select: { id: true, displayName: true, avatarUrl: true } },
  seller: { select: { id: true, displayName: true, avatarUrl: true } },
  conversation: { select: { id: true, isReadonly: true } },
} as const;

export async function getBuyerRentals(
  buyerId: string,
): Promise<BuyerRentalsGrouped> {
  const rows = await prisma.rental.findMany({
    where: { buyerId },
    select: rentalCardSelect,
    orderBy: { createdAt: "desc" },
    take: RENTAL_DASHBOARD_TAKE,
  });

  return groupRentalsByTab(rows.map(toRentalCardView));
}

export async function getSellerRentals(
  sellerId: string,
): Promise<SellerRentalsGrouped> {
  const rows = await prisma.rental.findMany({
    where: { sellerId },
    select: rentalCardSelect,
    orderBy: { createdAt: "desc" },
    take: RENTAL_DASHBOARD_TAKE,
  });

  return groupRentalsByTab(rows.map(toRentalCardView));
}

export async function getRentalByIdForUser(
  rentalId: string,
  userId: string,
): Promise<RentalCardView | null> {
  const rental = await prisma.rental.findFirst({
    where: {
      id: rentalId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: rentalCardSelect,
  });

  return rental ? toRentalCardView(rental) : null;
}
