import "server-only";

import type { AdminAuditRow, Paginated } from "@/features/admin/types/admin";
import { ADMIN_PAGE_SIZE } from "@/features/admin/types/admin";
import { prisma } from "@/lib/db/prisma";

export async function getAdminAuditLogsPage(params: {
  page?: number;
  pageSize?: number;
  entityType?: string;
}): Promise<Paginated<AdminAuditRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? ADMIN_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = params.entityType ? { entityType: params.entityType } : {};

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        reason: true,
        createdAt: true,
        actor: { select: { displayName: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorName: r.actor?.displayName ?? null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
