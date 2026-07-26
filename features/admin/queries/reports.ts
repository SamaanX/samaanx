import "server-only";

import type { Prisma, ReportStatus } from "@prisma/client";

import type { AdminReportRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminReportsPage(params: {
  page?: number;
  pageSize?: number;
  status?: ReportStatus;
  q?: string;
}): Promise<Paginated<AdminReportRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ReportWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? {
          OR: [
            { reason: { contains: params.q, mode: "insensitive" } },
            { details: { contains: params.q, mode: "insensitive" } },
            {
              reporter: {
                displayName: { contains: params.q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
        reporter: { select: { displayName: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      reporterName: r.reporter.displayName,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getAdminReportDetail(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, displayName: true, email: true } },
      assignedAdmin: { select: { id: true, displayName: true } },
      rental: {
        select: {
          id: true,
          status: true,
          listing: { select: { title: true } },
        },
      },
    },
  });
}
