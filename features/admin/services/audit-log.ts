import "server-only";

import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export type WriteAuditLogParams = {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  reason?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export async function writeAuditLog(
  params: WriteAuditLogParams,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason,
        previousValue: params.previousValue as Prisma.InputJsonValue,
        newValue: params.newValue as Prisma.InputJsonValue,
        metadata: params.metadata as Prisma.InputJsonValue,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    logger.error("writeAuditLog failed", {
      message: error instanceof Error ? error.message : "unknown",
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}

export async function writeAdminActionLog(
  params: Omit<WriteAuditLogParams, "action"> & { action?: AuditAction },
): Promise<void> {
  await writeAuditLog({
    ...params,
    action: params.action ?? "ADMIN_ACTION",
  });
}
