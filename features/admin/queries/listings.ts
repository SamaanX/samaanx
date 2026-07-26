import "server-only";

import type {
  ListingModerationStatus,
  ListingStatus,
  Prisma,
} from "@prisma/client";

import type { AdminListingRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminListingsPage(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  moderationStatus?: ListingModerationStatus;
  status?: ListingStatus;
}): Promise<Paginated<AdminListingRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ListingWhereInput = {
    deletedAt: null,
    ...(params.moderationStatus
      ? { moderationStatus: params.moderationStatus }
      : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { city: { contains: params.q, mode: "insensitive" } },
            {
              seller: {
                displayName: { contains: params.q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
        moderationReason: true,
        city: true,
        createdAt: true,
        seller: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      moderationStatus: r.moderationStatus,
      moderationReason: r.moderationReason,
      sellerName: r.seller.displayName,
      sellerId: r.seller.id,
      city: r.city,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminListingDetail(listingId: string) {
  return prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    include: {
      seller: {
        select: {
          id: true,
          displayName: true,
          email: true,
          verificationBadge: true,
        },
      },
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
}
