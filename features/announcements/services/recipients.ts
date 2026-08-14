import "server-only";

import type { AnnouncementTarget, Prisma } from "@prisma/client";

import { isAdminRole } from "@/features/admin/services/permissions";
import { prisma } from "@/lib/db/prisma";

type RecipientProfile = {
  id: string;
  preferredMode: "BUYER" | "SELLER";
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export async function resolveAnnouncementRecipientIds(
  target: AnnouncementTarget,
  targetUserId?: string | null,
): Promise<string[]> {
  if (target === "USER") {
    if (!targetUserId) return [];
    const user = await prisma.profile.findFirst({
      where: { id: targetUserId, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    return user ? [user.id] : [];
  }

  const where: Prisma.ProfileWhereInput = {
    deletedAt: null,
    status: "ACTIVE",
  };

  if (target === "BUYERS") {
    where.preferredMode = "BUYER";
  } else if (target === "SELLERS") {
    where.preferredMode = "SELLER";
  } else if (target === "ADMINS") {
    where.role = { in: ["ADMIN", "SUPER_ADMIN"] };
  }

  const profiles = await prisma.profile.findMany({
    where,
    select: { id: true },
  });

  return profiles.map((profile) => profile.id);
}

export function announcementMatchesProfile(
  target: AnnouncementTarget,
  targetUserId: string | null,
  profile: RecipientProfile,
): boolean {
  switch (target) {
    case "ALL":
      return true;
    case "USER":
      return targetUserId === profile.id;
    case "BUYERS":
      return profile.preferredMode === "BUYER";
    case "SELLERS":
      return profile.preferredMode === "SELLER";
    case "ADMINS":
      return isAdminRole(profile.role);
    default:
      return false;
  }
}
