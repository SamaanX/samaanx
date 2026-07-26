import { DEFAULT_LOCALE } from "@/config/constants";
import type { RentalCardView } from "@/features/rentals/types/rental";

export function formatRentalMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRentalDates(
  rental: Pick<RentalCardView, "startDate" | "endDate">,
): string {
  const fmt = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(`${rental.startDate}T00:00:00.000Z`))} – ${fmt.format(new Date(`${rental.endDate}T00:00:00.000Z`))}`;
}

export function formatCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
