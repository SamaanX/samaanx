import type { AppMode, Profile, VerificationBadgeStatus } from "@prisma/client";

export type ProfileActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL";
};

export type ProfileActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ProfileActionError };

/** Client-safe profile shape (no Prisma Decimal / Date objects). */
export type ProfileViewModel = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  area: string | null;
  countryCode: string;
  preferredMode: AppMode;
  verificationBadge: VerificationBadgeStatus;
  avgRating: number;
  ratingCount: number;
  completedRentalsCount: number;
  responseTimeMinutesAvg: number | null;
  cancellationRate: number;
  memberSince: string;
};

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date(0).toISOString();
}

export function toProfileViewModel(profile: Profile): ProfileViewModel {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    bio: profile.bio,
    city: profile.city,
    area: profile.area,
    countryCode: profile.countryCode,
    preferredMode: profile.preferredMode,
    verificationBadge: profile.verificationBadge,
    avgRating: Number(profile.avgRating),
    ratingCount: profile.ratingCount,
    completedRentalsCount: profile.completedRentalsCount,
    responseTimeMinutesAvg: profile.responseTimeMinutesAvg,
    cancellationRate: Number(profile.cancellationRate),
    memberSince: toIsoString(profile.memberSince),
  };
}
