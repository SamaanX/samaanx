import type { RentalStatus } from "@prisma/client";

import { groupRentalsByTab } from "@/features/rentals/services/mappers";
import type {
  BuyerRentalsGrouped,
  RentalCardView,
} from "@/features/rentals/types/rental";

function flattenGroups(groups: BuyerRentalsGrouped): RentalCardView[] {
  return [
    ...groups.pending,
    ...groups.approved,
    ...groups.active,
    ...groups.rejected,
    ...groups.cancelled,
    ...groups.completed,
  ];
}

/** Instant UI move of a rental into its next status bucket (reconciled by refetch). */
export function applyOptimisticRentalStatus(
  groups: BuyerRentalsGrouped,
  rentalId: string,
  nextStatus: RentalStatus,
): BuyerRentalsGrouped {
  const next = flattenGroups(groups).map((rental) =>
    rental.id === rentalId ? { ...rental, status: nextStatus } : rental,
  );
  return groupRentalsByTab(next);
}

export function removeRentalFromGroups(
  groups: BuyerRentalsGrouped,
  rentalId: string,
): BuyerRentalsGrouped {
  return groupRentalsByTab(
    flattenGroups(groups).filter((rental) => rental.id !== rentalId),
  );
}
