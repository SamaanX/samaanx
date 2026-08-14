import "server-only";

import type {
  AdminSearchResult,
  AnnouncementView,
  PlatformSettingsView,
} from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_SETTINGS: PlatformSettingsView = {
  maintenanceMode: false,
  maxActiveListingsPerSeller: 50,
  maxRentalDays: 90,
  defaultDepositType: "NONE",
  supportEmail: "support@samaanx.com",
  platformAnnouncement: null,
};

export async function getPlatformSettings(): Promise<PlatformSettingsView> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: "marketplace" },
  });
  if (!row?.value || typeof row.value !== "object") return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as PlatformSettingsView) };
}

export async function getAdminAnnouncements(): Promise<AnnouncementView[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: { startsAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      target: true,
      targetUserId: true,
      dismissible: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      targetUser: {
        select: { displayName: true, email: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    target: r.target,
    targetUserId: r.targetUserId,
    targetUserLabel: r.targetUser
      ? `${r.targetUser.displayName} · ${r.targetUser.email}`
      : null,
    dismissible: r.dismissible,
    isActive: r.isActive,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt?.toISOString() ?? null,
  }));
}

export async function adminGlobalSearch(q: string): Promise<AdminSearchResult> {
  const term = q.trim();
  if (term.length < 2) {
    return { users: [], listings: [], rentals: [], reports: [] };
  }

  const [users, listings, rentals, reports] = await Promise.all([
    prisma.profile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { email: { contains: term, mode: "insensitive" } },
          { displayName: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, displayName: true, email: true },
    }),
    prisma.listing.findMany({
      where: {
        deletedAt: null,
        title: { contains: term, mode: "insensitive" },
      },
      take: 5,
      select: { id: true, title: true, slug: true },
    }),
    prisma.rental.findMany({
      where: {
        OR: [
          { id: term },
          { listing: { title: { contains: term, mode: "insensitive" } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        status: true,
        listing: { select: { title: true } },
      },
    }),
    prisma.report.findMany({
      where: {
        OR: [
          { reason: { contains: term, mode: "insensitive" } },
          { details: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, type: true, reason: true },
    }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      label: `${u.displayName} · ${u.email}`,
      href: `/admin/users/${u.id}`,
    })),
    listings: listings.map((l) => ({
      id: l.id,
      label: l.title,
      href: `/admin/listings?q=${encodeURIComponent(l.title)}`,
    })),
    rentals: rentals.map((r) => ({
      id: r.id,
      label: `${r.listing.title} · ${r.status}`,
      href: `/admin/disputes?rental=${r.id}`,
    })),
    reports: reports.map((r) => ({
      id: r.id,
      label: `${r.type}: ${r.reason.slice(0, 60)}`,
      href: `/admin/reports?q=${encodeURIComponent(r.id)}`,
    })),
  };
}
