import type { RentPriceUnit } from "@prisma/client";

import { DEFAULT_LOCALE } from "@/config/constants";

export function formatRentPrice(
  amount: number,
  currency: string,
  unit: RentPriceUnit,
): string {
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  const unitLabel = unit === "DAY" ? "day" : unit === "WEEK" ? "week" : "month";

  return `${formatted}/${unitLabel}`;
}

export function formatSellerRating(
  avgRating: number,
  ratingCount: number,
): string {
  if (ratingCount === 0) {
    return "New";
  }
  return `${avgRating.toFixed(1)}`;
}

export function formatDeposit(params: {
  depositType: "NONE" | "FIXED" | "PERCENTAGE";
  depositAmount: number | null;
  depositPercent: number | null;
  currency: string;
}): string {
  if (params.depositType === "NONE") {
    return "No deposit";
  }
  if (params.depositType === "PERCENTAGE") {
    return `${params.depositPercent ?? 0}% deposit`;
  }
  if (params.depositAmount === null) {
    return "Fixed deposit";
  }
  return `${new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: params.currency,
    maximumFractionDigits: 0,
  }).format(params.depositAmount)} deposit`;
}

export function formatMemberSinceShort(iso: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatResponseTimeShort(minutes: number | null): string {
  if (minutes === null) {
    return "—";
  }
  if (minutes < 60) {
    return `${minutes}m avg`;
  }
  return `${Math.round(minutes / 60)}h avg`;
}
