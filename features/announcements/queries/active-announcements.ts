import "server-only";

import { cache } from "react";

import { announcementMatchesProfile } from "@/features/announcements/services/recipients";
import { prisma } from "@/lib/db/prisma";

export type ActiveAnnouncement = {
  id: string;
  title: string;
  body: string;
  dismissible: boolean;
  targetUrl: string | null;
};

export const getActiveAnnouncementsForUser = cache(
  async (userId: string): Promise<ActiveAnnouncement[]> => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { id: true, preferredMode: true, role: true },
      });
      if (!profile) return [];

      const now = new Date();

      const dismissed = await prisma.announcementDismissal.findMany({
        where: { userId },
        select: { announcementId: true },
      });
      const dismissedIds = dismissed.map((row) => row.announcementId);

      const rows = await prisma.announcement.findMany({
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          ...(dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {}),
        },
        orderBy: { startsAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          body: true,
          dismissible: true,
          target: true,
          targetUserId: true,
          targetUrl: true,
        },
      });

      return rows
        .filter((row) =>
          announcementMatchesProfile(row.target, row.targetUserId, profile),
        )
        .slice(0, 2)
        .map((row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          dismissible: row.dismissible,
          targetUrl: row.targetUrl,
        }));
    } catch {
      // Migration 020 may not be applied yet — do not break the homepage.
      return [];
    }
  },
);
