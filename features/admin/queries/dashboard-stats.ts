import "server-only";

import { cache } from "react";

import type {
  AdminDashboardStats,
  AdminGrowthPoint,
} from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export const getAdminDashboardStats = cache(
  async (): Promise<AdminDashboardStats> => {
    const [
      totalUsers,
      buyers,
      sellers,
      verifiedSellers,
      listings,
      activeListings,
      pendingListings,
      rejectedListings,
      rentals,
      completedRentals,
      openReports,
      openFeedback,
      openDisputes,
    ] = await Promise.all([
      prisma.profile.count({ where: { deletedAt: null } }),
      prisma.profile.count({
        where: { deletedAt: null, preferredMode: "BUYER" },
      }),
      prisma.profile.count({
        where: { deletedAt: null, preferredMode: "SELLER" },
      }),
      prisma.profile.count({
        where: {
          deletedAt: null,
          verificationBadge: "VERIFIED",
          preferredMode: "SELLER",
        },
      }),
      prisma.listing.count({ where: { deletedAt: null } }),
      prisma.listing.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          moderationStatus: "APPROVED",
        },
      }),
      prisma.listing.count({
        where: { deletedAt: null, moderationStatus: "PENDING" },
      }),
      prisma.listing.count({
        where: { deletedAt: null, moderationStatus: "REJECTED" },
      }),
      prisma.rental.count(),
      prisma.rental.count({ where: { status: "COMPLETED" } }),
      prisma.report.count({
        where: { status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      prisma.userFeedback.count({
        where: { status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      prisma.dispute.count({
        where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      }),
    ]);

    return {
      totalUsers,
      buyers,
      sellers,
      verifiedSellers,
      listings,
      activeListings,
      pendingListings,
      rejectedListings,
      rentals,
      completedRentals,
      openReports,
      openFeedback,
      openDisputes,
      revenuePlaceholder: 0,
    };
  },
);

export const getAdminGrowthSeries = cache(
  async (days = 30): Promise<AdminGrowthPoint[]> => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [users, listings, rentals] = await Promise.all([
      prisma.profile.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.listing.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.rental.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const buckets = new Map<string, AdminGrowthPoint>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, users: 0, listings: 0, rentals: 0 });
    }

    for (const row of users) {
      const key = row.createdAt.toISOString().slice(0, 10);
      buckets.get(key)!.users += 1;
    }
    for (const row of listings) {
      const key = row.createdAt.toISOString().slice(0, 10);
      buckets.get(key)!.listings += 1;
    }
    for (const row of rentals) {
      const key = row.createdAt.toISOString().slice(0, 10);
      buckets.get(key)!.rentals += 1;
    }

    return [...buckets.values()];
  },
);

export const getAdminRecentActivity = cache(async () => {
  const [reports, rentals, listings, users] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        reporter: { select: { displayName: true } },
      },
    }),
    prisma.rental.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        listing: { select: { title: true } },
      },
    }),
    prisma.listing.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        moderationStatus: true,
        createdAt: true,
      },
    }),
    prisma.profile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
    }),
  ]);

  return { reports, rentals, listings, users };
});

export const getAdminAnalyticsSummary = cache(async () => {
  const [
    topCategories,
    topCities,
    topSellers,
    topListings,
    cancellationCount,
    approvedCount,
    requestedCount,
  ] = await Promise.all([
    prisma.listing.groupBy({
      by: ["categoryId"],
      where: { deletedAt: null, status: "ACTIVE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.listing.groupBy({
      by: ["city"],
      where: { deletedAt: null, status: "ACTIVE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.profile.findMany({
      where: { deletedAt: null, preferredMode: "SELLER" },
      orderBy: { completedRentalsCount: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        completedRentalsCount: true,
        avgRating: true,
      },
    }),
    prisma.listing.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { requestCount: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        requestCount: true,
        viewCount: true,
        city: true,
      },
    }),
    prisma.rental.count({
      where: { status: { in: ["CANCELLED", "REJECTED"] } },
    }),
    prisma.rental.count({ where: { status: "APPROVED" } }),
    prisma.rental.count({ where: { status: "REQUESTED" } }),
  ]);

  const categoryIds = topCategories.map((c) => c.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const totalDecided = approvedCount + cancellationCount;
  const approvalRate = totalDecided
    ? Math.round((approvedCount / totalDecided) * 100)
    : 0;
  const cancellationRate = totalDecided
    ? Math.round((cancellationCount / totalDecided) * 100)
    : 0;

  return {
    topCategories: topCategories.map((c) => ({
      name: categoryMap.get(c.categoryId) ?? "Unknown",
      count: c._count.id,
    })),
    topCities: topCities.map((c) => ({
      name: c.city,
      count: c._count.id,
    })),
    topSellers,
    topListings,
    approvalRate,
    cancellationRate,
    pendingRequests: requestedCount,
  };
});
