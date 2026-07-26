import type { Profile } from "@prisma/client";
import type { User } from "@supabase/supabase-js";

import { DEFAULT_COUNTRY_CODE } from "@/config/constants";
import { prisma } from "@/lib/db/prisma";
import { withPerf } from "@/lib/perf";

function resolveDisplayName(user: User, fallback?: string): string {
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined;

  if (fallback?.trim()) {
    return fallback.trim();
  }

  if (metaName?.trim()) {
    return metaName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0] ?? "SamaanX User";
  }

  return "SamaanX User";
}

function resolveAvatarUrl(user: User): string | null {
  const avatar =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;

  return avatar;
}

/**
 * Ensures a Profile row exists for a non-anonymous auth user.
 * Profile.id === auth.users.id. Idempotent upsert — no duplicates.
 * Guests / anonymous users must NOT get a profile (Architecture locked).
 */
export async function ensureProfileForUser(
  user: User,
  options?: { displayName?: string },
): Promise<Profile | null> {
  if (user.is_anonymous) {
    return null;
  }

  if (!user.email) {
    throw new Error("Authenticated user is missing an email address.");
  }

  const displayName = resolveDisplayName(user, options?.displayName);
  const avatarUrl = resolveAvatarUrl(user);
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const isConfiguredSuperAdmin =
    superAdminEmail != null &&
    superAdminEmail.length > 0 &&
    user.email.toLowerCase() === superAdminEmail;

  return prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      displayName,
      avatarUrl,
      preferredMode: "BUYER",
      role: isConfiguredSuperAdmin ? "SUPER_ADMIN" : "USER",
      status: "ACTIVE",
      verificationBadge: "UNVERIFIED",
      countryCode: DEFAULT_COUNTRY_CODE,
      memberSince: new Date(),
    },
    update: {
      email: user.email,
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(isConfiguredSuperAdmin ? { role: "SUPER_ADMIN" } : {}),
    },
  });
}

/**
 * Live Prisma read (Date/Decimal intact).
 * Cross-request unstable_cache was removed — it JSON-serializes Dates and broke
 * toProfileViewModel. Request-scoped dedupe still happens via React cache() in
 * getCurrentProfile / getCurrentUser.
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  return withPerf("profile.fetch", async () => {
    const row = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        role: true,
        preferredMode: true,
        status: true,
        city: true,
        area: true,
        countryCode: true,
        avgRating: true,
        ratingCount: true,
        completedRentalsCount: true,
        responseTimeMinutesAvg: true,
        cancellationRate: true,
        verificationBadge: true,
        memberSince: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        // lat/lng omitted — unused on chrome / most pages
      },
    });

    // Cast: selected shape matches Profile for app usage (geo unused).
    return row as Profile | null;
  });
}
