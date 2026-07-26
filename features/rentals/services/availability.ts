import type { Prisma } from "@prisma/client";

import {
  DATE_HOLDING_STATUSES,
  parseDateOnly,
  rangesOverlap,
  toDateOnlyString,
  todayDateOnlyUtc,
} from "@/domain/rental";
import {
  rentalConflict,
  rentalValidation,
} from "@/features/rentals/services/rental-errors";
import { prisma } from "@/lib/db/prisma";

type AvailabilityRow = {
  type: "AVAILABLE" | "BLOCKED";
  startDate: Date;
  endDate: Date;
};

type HoldingRental = {
  id: string;
  startDate: Date;
  endDate: Date;
};

export async function assertListingDatesBookable(params: {
  listingId: string;
  startDate: string;
  endDate: string;
  /** Exclude this rental when re-checking on approve. */
  excludeRentalId?: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const db = params.tx ?? prisma;
  const today = todayDateOnlyUtc();

  if (params.endDate < params.startDate) {
    throw rentalValidation("End date cannot be before start date.");
  }

  if (params.startDate < today) {
    throw rentalValidation("Start date cannot be in the past.");
  }

  const availability = await db.listingAvailability.findMany({
    where: { listingId: params.listingId },
    select: { type: true, startDate: true, endDate: true },
  });

  assertWithinAvailableWindow(params.startDate, params.endDate, availability);
  assertNotBlocked(params.startDate, params.endDate, availability);

  const holding = await db.rental.findMany({
    where: {
      listingId: params.listingId,
      status: { in: [...DATE_HOLDING_STATUSES] },
      ...(params.excludeRentalId
        ? { id: { not: params.excludeRentalId } }
        : {}),
    },
    select: { id: true, startDate: true, endDate: true },
  });

  assertNoHoldingOverlap(params.startDate, params.endDate, holding);
}

function assertWithinAvailableWindow(
  startDate: string,
  endDate: string,
  rows: AvailabilityRow[],
): void {
  const covered = rows.some((row) => {
    if (row.type !== "AVAILABLE") {
      return false;
    }
    const rowStart = toDateOnlyString(row.startDate);
    const rowEnd = toDateOnlyString(row.endDate);
    return rowStart <= startDate && rowEnd >= endDate;
  });

  if (!covered) {
    throw rentalConflict(
      "Selected dates are outside the listing’s available windows.",
    );
  }
}

function assertNotBlocked(
  startDate: string,
  endDate: string,
  rows: AvailabilityRow[],
): void {
  const blocked = rows.some((row) => {
    if (row.type !== "BLOCKED") {
      return false;
    }
    return rangesOverlap(
      startDate,
      endDate,
      toDateOnlyString(row.startDate),
      toDateOnlyString(row.endDate),
    );
  });

  if (blocked) {
    throw rentalConflict("Selected dates overlap a blocked period.");
  }
}

function assertNoHoldingOverlap(
  startDate: string,
  endDate: string,
  holding: HoldingRental[],
): void {
  const conflict = holding.some((rental) =>
    rangesOverlap(
      startDate,
      endDate,
      toDateOnlyString(rental.startDate),
      toDateOnlyString(rental.endDate),
    ),
  );

  if (conflict) {
    throw rentalConflict(
      "Those dates are already booked by another approved rental.",
    );
  }
}

type AvailabilityHintRow = {
  type: "AVAILABLE" | "BLOCKED" | string;
  startDate: string | Date;
  endDate: string | Date;
};

export async function getUnavailableDateHints(
  listingId: string,
  /** Pass listing.availability from detail query to skip a duplicate read. */
  preloadedAvailability?: AvailabilityHintRow[],
): Promise<{
  blocked: Array<{ startDate: string; endDate: string }>;
  booked: Array<{ startDate: string; endDate: string }>;
  available: Array<{ startDate: string; endDate: string }>;
}> {
  const [availability, holding] = await Promise.all([
    preloadedAvailability
      ? Promise.resolve(preloadedAvailability)
      : prisma.listingAvailability.findMany({
          where: { listingId },
          select: { type: true, startDate: true, endDate: true },
          orderBy: { startDate: "asc" },
        }),
    prisma.rental.findMany({
      where: {
        listingId,
        status: { in: [...DATE_HOLDING_STATUSES] },
      },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const toKey = (value: string | Date) =>
    typeof value === "string" ? value.slice(0, 10) : toDateOnlyString(value);

  return {
    available: availability
      .filter((row) => row.type === "AVAILABLE")
      .map((row) => ({
        startDate: toKey(row.startDate),
        endDate: toKey(row.endDate),
      })),
    blocked: availability
      .filter((row) => row.type === "BLOCKED")
      .map((row) => ({
        startDate: toKey(row.startDate),
        endDate: toKey(row.endDate),
      })),
    booked: holding.map((row) => ({
      startDate: toDateOnlyString(row.startDate),
      endDate: toDateOnlyString(row.endDate),
    })),
  };
}

export function toUtcDate(value: string): Date {
  return parseDateOnly(value);
}
