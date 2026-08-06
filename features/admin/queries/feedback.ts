import "server-only";

import type { FeedbackStatus, Prisma } from "@prisma/client";

import type { AdminFeedbackRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminFeedbackPage(params: {
  page?: number;
  pageSize?: number;
  status?: FeedbackStatus;
  q?: string;
}): Promise<Paginated<AdminFeedbackRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserFeedbackWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { subject: { contains: params.q, mode: "insensitive" } },
            { message: { contains: params.q, mode: "insensitive" } },
            {
              user: {
                displayName: { contains: params.q, mode: "insensitive" },
              },
            },
            {
              user: { email: { contains: params.q, mode: "insensitive" } },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.userFeedback.count({ where }),
    prisma.userFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        category: true,
        subject: true,
        message: true,
        pageUrl: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        user: { select: { displayName: true, email: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      category: r.category,
      subject: r.subject,
      message: r.message,
      pageUrl: r.pageUrl,
      status: r.status,
      adminNotes: r.adminNotes,
      userName: r.user.displayName,
      userEmail: r.user.email,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function countOpenFeedback(): Promise<number> {
  return prisma.userFeedback.count({
    where: { status: { in: ["OPEN", "IN_REVIEW"] } },
  });
}
