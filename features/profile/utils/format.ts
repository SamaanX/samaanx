import { DEFAULT_LOCALE } from "@/config/constants";
import type { ProfileViewModel } from "@/features/profile/types/profile";

const countryNames = new Intl.DisplayNames([DEFAULT_LOCALE], {
  type: "region",
});

export function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatCountry(countryCode: string): string {
  try {
    return countryNames.of(countryCode.toUpperCase()) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function formatRating(profile: ProfileViewModel): string {
  if (profile.ratingCount === 0) {
    return "No ratings yet";
  }
  return `${profile.avgRating.toFixed(1)} · ${profile.ratingCount} review${profile.ratingCount === 1 ? "" : "s"}`;
}

export function formatCancellationRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function formatResponseTime(minutes: number | null): string {
  if (minutes === null) {
    return "Not enough data";
  }
  if (minutes < 60) {
    return `${minutes} min avg`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h avg`;
}

export function verificationLabel(
  badge: ProfileViewModel["verificationBadge"],
): string {
  switch (badge) {
    case "VERIFIED":
      return "Verified";
    case "PENDING":
      return "Verification pending";
    default:
      return "Unverified";
  }
}

export function modeLabel(mode: ProfileViewModel["preferredMode"]): string {
  return mode === "SELLER" ? "Seller" : "Buyer";
}
