import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * Recompute denormalized avgRating + ratingCount from reviews received.
 */
export async function recomputeProfileRating(
  revieweeId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ avgRating: number; ratingCount: number }> {
  const agg = await tx.review.aggregate({
    where: { revieweeId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const ratingCount = agg._count._all;
  const avgRating =
    ratingCount === 0
      ? 0
      : Math.round(Number(agg._avg.rating ?? 0) * 100) / 100;

  await tx.profile.update({
    where: { id: revieweeId },
    data: {
      avgRating,
      ratingCount,
    },
  });

  return { avgRating, ratingCount };
}

/**
 * Cancellation rate = cancelled / (completed + cancelled) as participant.
 */
export async function recomputeCancellationRate(
  userId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const [completed, cancelled] = await Promise.all([
    tx.rental.count({
      where: {
        status: "COMPLETED",
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    }),
    tx.rental.count({
      where: {
        status: "CANCELLED",
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    }),
  ]);

  const denom = completed + cancelled;
  const rate =
    denom === 0 ? 0 : Math.round((cancelled / denom) * 10000) / 10000;

  await tx.profile.update({
    where: { id: userId },
    data: { cancellationRate: rate },
  });

  return rate;
}

/**
 * Rolling response time when a seller approves a request.
 */
export async function updateSellerResponseTime(params: {
  sellerId: string;
  responseMinutes: number;
  tx?: Prisma.TransactionClient | typeof prisma;
}): Promise<void> {
  const db = params.tx ?? prisma;
  const profile = await db.profile.findUnique({
    where: { id: params.sellerId },
    select: { responseTimeMinutesAvg: true },
  });
  if (!profile) return;

  const next =
    profile.responseTimeMinutesAvg == null
      ? Math.max(1, Math.round(params.responseMinutes))
      : Math.max(
          1,
          Math.round(
            profile.responseTimeMinutesAvg * 0.7 + params.responseMinutes * 0.3,
          ),
        );

  await db.profile.update({
    where: { id: params.sellerId },
    data: { responseTimeMinutesAvg: next },
  });
}
