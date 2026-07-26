import "server-only";

import type { Prisma, ProfileStatus, UserRole } from "@prisma/client";

import type { AdminUserRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminUsersPage(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ProfileStatus;
  role?: UserRole;
}): Promise<Paginated<AdminUserRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProfileWhereInput = {
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
    ...(params.role ? { role: params.role } : {}),
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: "insensitive" } },
            { displayName: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        preferredMode: true,
        verificationBadge: true,
        completedRentalsCount: true,
        avgRating: true,
        memberSince: true,
        lastSeenAt: true,
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.displayName,
      role: r.role,
      status: r.status,
      preferredMode: r.preferredMode,
      verificationBadge: r.verificationBadge,
      completedRentalsCount: r.completedRentalsCount,
      avgRating: Number(r.avgRating),
      memberSince: r.memberSince.toISOString(),
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminUserDetail(userId: string) {
  return prisma.profile.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      preferredMode: true,
      verificationBadge: true,
      bio: true,
      city: true,
      area: true,
      avgRating: true,
      ratingCount: true,
      completedRentalsCount: true,
      responseTimeMinutesAvg: true,
      cancellationRate: true,
      memberSince: true,
      lastSeenAt: true,
      createdAt: true,
      listingsOwned: {
        where: { deletedAt: null },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, moderationStatus: true },
      },
      rentalsAsBuyer: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          listing: { select: { title: true } },
        },
      },
      rentalsAsSeller: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          listing: { select: { title: true } },
        },
      },
      reviewsReceived: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { rating: true, comment: true, createdAt: true },
      },
      reportsFiled: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, status: true, createdAt: true },
      },
    },
  });
}
