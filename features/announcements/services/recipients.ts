import "server-only";

import type { AnnouncementTarget, Prisma } from "@prisma/client";

import { isAdminRole } from "@/features/admin/services/permissions";
import { prisma } from "@/lib/db/prisma";

type RecipientProfile = {
  id: string;
  preferredMode: "BUYER" | "SELLER";
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export const ANNOUNCEMENT_RECIPIENT_CHUNK_SIZE = 250;

function profileWhereForTarget(
  target: AnnouncementTarget,
): Prisma.ProfileWhereInput | null {
  if (target === "USER") return null;

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

  return where;
}

/** Count recipients without loading all IDs into memory. */
export async function countAnnouncementRecipients(
  target: AnnouncementTarget,
  targetUserId?: string | null,
): Promise<number> {
  if (target === "USER") {
    if (!targetUserId) return 0;
    return prisma.profile.count({
      where: { id: targetUserId, deletedAt: null, status: "ACTIVE" },
    });
  }

  const where = profileWhereForTarget(target);
  if (!where) return 0;
  return prisma.profile.count({ where });
}

/** Cursor-paginated recipient IDs — never loads full user table. */
export async function fetchAnnouncementRecipientChunk(params: {
  target: AnnouncementTarget;
  targetUserId?: string | null;
  take?: number;
  cursor?: string | null;
}): Promise<{ ids: string[]; nextCursor: string | null }> {
  const take = params.take ?? ANNOUNCEMENT_RECIPIENT_CHUNK_SIZE;

  if (params.target === "USER") {
    if (!params.targetUserId || params.cursor) {
      return { ids: [], nextCursor: null };
    }
    const user = await prisma.profile.findFirst({
      where: {
        id: params.targetUserId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return { ids: user ? [user.id] : [], nextCursor: null };
  }

  const where = profileWhereForTarget(params.target);
  if (!where) return { ids: [], nextCursor: null };

  const rows = await prisma.profile.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
    take,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  return {
    ids: rows.map((row) => row.id),
    nextCursor:
      rows.length === take ? (rows[rows.length - 1]?.id ?? null) : null,
  };
}

/** @deprecated Prefer chunked `fetchAnnouncementRecipientChunk` for broadcasts. */
export async function resolveAnnouncementRecipientIds(
  target: AnnouncementTarget,
  targetUserId?: string | null,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;

  for (;;) {
    const chunk = await fetchAnnouncementRecipientChunk({
      target,
      targetUserId,
      cursor,
    });
    ids.push(...chunk.ids);
    cursor = chunk.nextCursor;
    if (!cursor) break;
  }

  return ids;
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
