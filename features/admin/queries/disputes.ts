import "server-only";

import type { DisputeStatus, Prisma } from "@prisma/client";

import type { AdminDisputeRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminDisputesPage(params: {
  page?: number;
  pageSize?: number;
  status?: DisputeStatus;
}): Promise<Paginated<AdminDisputeRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.DisputeWhereInput = params.status
    ? { status: params.status }
    : {};

  const [total, rows] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        rentalId: true,
        status: true,
        createdAt: true,
        openedBy: { select: { displayName: true } },
        rental: {
          select: {
            listing: { select: { title: true } },
            buyer: { select: { displayName: true } },
            seller: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      rentalId: r.rentalId,
      status: r.status,
      listingTitle: r.rental.listing.title,
      buyerName: r.rental.buyer.displayName,
      sellerName: r.rental.seller.displayName,
      openedByName: r.openedBy.displayName,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminDisputeDetail(disputeId: string) {
  return prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      openedBy: { select: { id: true, displayName: true, email: true } },
      assignedAdmin: { select: { id: true, displayName: true } },
      rental: {
        include: {
          listing: { select: { id: true, title: true, slug: true } },
          buyer: { select: { id: true, displayName: true, email: true } },
          seller: { select: { id: true, displayName: true, email: true } },
          conversation: {
            select: {
              id: true,
              messages: {
                orderBy: { createdAt: "asc" },
                take: 50,
                select: {
                  id: true,
                  body: true,
                  createdAt: true,
                  sender: { select: { displayName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}
