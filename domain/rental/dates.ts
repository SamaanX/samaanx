import type { RentalStatus } from "@prisma/client";

/** Statuses that hold calendar dates (booked / not re-requestable). */
export const DATE_HOLDING_STATUSES = [
  "APPROVED",
  "HANDOVER_PENDING",
  "ACTIVE",
  "RETURN_PENDING",
] as const satisfies readonly RentalStatus[];

export type DateHoldingStatus = (typeof DATE_HOLDING_STATUSES)[number];

export function isDateHoldingStatus(
  status: RentalStatus,
): status is DateHoldingStatus {
  return (DATE_HOLDING_STATUSES as readonly string[]).includes(status);
}

/** Inclusive calendar-day span between two YYYY-MM-DD dates. */
export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayDateOnlyUtc(): string {
  return toDateOnlyString(new Date());
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export type RentPriceUnit = "DAY" | "WEEK" | "MONTH";

export type CostEstimate = {
  durationDays: number;
  billableUnits: number;
  unitLabel: string;
  rentSubtotal: number;
  depositAmount: number;
  estimatedTotal: number;
};

export function estimateRentalCost(params: {
  startDate: string;
  endDate: string;
  rentPriceAmount: number;
  rentPriceUnit: RentPriceUnit;
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositAmount: number | null;
  depositPercent: number | null;
}): CostEstimate {
  const durationDays = inclusiveDayCount(params.startDate, params.endDate);
  let billableUnits = durationDays;
  let unitLabel = durationDays === 1 ? "day" : "days";

  if (params.rentPriceUnit === "WEEK") {
    billableUnits = Math.max(1, Math.ceil(durationDays / 7));
    unitLabel = billableUnits === 1 ? "week" : "weeks";
  } else if (params.rentPriceUnit === "MONTH") {
    billableUnits = Math.max(1, Math.ceil(durationDays / 30));
    unitLabel = billableUnits === 1 ? "month" : "months";
  }

  const rentSubtotal = roundMoney(params.rentPriceAmount * billableUnits);
  const depositAmount = resolveDepositMoney({
    depositType: params.depositType,
    depositAmount: params.depositAmount,
    depositPercent: params.depositPercent,
    rentSubtotal,
  });

  return {
    durationDays,
    billableUnits,
    unitLabel,
    rentSubtotal,
    depositAmount,
    estimatedTotal: roundMoney(rentSubtotal + depositAmount),
  };
}

function resolveDepositMoney(params: {
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositAmount: number | null;
  depositPercent: number | null;
  rentSubtotal: number;
}): number {
  if (params.depositType === "FIXED") {
    return roundMoney(params.depositAmount ?? 0);
  }
  if (params.depositType === "PERCENTAGE") {
    return roundMoney(
      (params.rentSubtotal * (params.depositPercent ?? 0)) / 100,
    );
  }
  return 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type AvailabilityHints = {
  available: Array<{ startDate: string; endDate: string }>;
  blocked: Array<{ startDate: string; endDate: string }>;
  booked: Array<{ startDate: string; endDate: string }>;
};

/** Client-safe: is a candidate range free given availability hints. */
export function isRangeSelectable(
  startDate: string,
  endDate: string,
  hints: AvailabilityHints,
): boolean {
  if (endDate < startDate) {
    return false;
  }
  if (startDate < todayDateOnlyUtc()) {
    return false;
  }

  const inAvailable = hints.available.some(
    (row) => row.startDate <= startDate && row.endDate >= endDate,
  );
  if (!inAvailable) {
    return false;
  }

  const hitBlocked = hints.blocked.some((row) =>
    rangesOverlap(startDate, endDate, row.startDate, row.endDate),
  );
  if (hitBlocked) {
    return false;
  }

  const hitBooked = hints.booked.some((row) =>
    rangesOverlap(startDate, endDate, row.startDate, row.endDate),
  );
  return !hitBooked;
}
