import type { Prisma } from "@prisma/client";
import type { ScheduledJobType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function enqueueScheduledJob(params: {
  type: ScheduledJobType;
  userId: string;
  rentalId?: string | null;
  listingId?: string | null;
  payload?: Prisma.InputJsonValue;
  runAt: Date;
  dedupeKey: string;
}): Promise<void> {
  try {
    await prisma.scheduledJob.create({
      data: {
        type: params.type,
        userId: params.userId,
        rentalId: params.rentalId ?? null,
        listingId: params.listingId ?? null,
        payload: params.payload as Prisma.InputJsonValue | undefined,
        runAt: params.runAt,
        dedupeKey: params.dedupeKey,
      },
    });
  } catch {
    // dedupe_key conflict — job already scheduled.
  }
}

/** Schedule rental reminder jobs after approval (non-blocking). */
export async function scheduleRentalReminderJobs(params: {
  rentalId: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingTitle: string;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  const dayBefore = new Date(params.startDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0);

  const hourBefore = new Date(params.startDate);
  hourBefore.setHours(hourBefore.getHours() - 1);

  const endingSoon = new Date(params.endDate);
  endingSoon.setDate(endingSoon.getDate() - 1);
  endingSoon.setHours(9, 0, 0, 0);

  const jobs = [
    {
      type: "RENTAL_STARTING_TOMORROW" as const,
      userId: params.buyerId,
      runAt: dayBefore,
      dedupeKey: `rental-start-tomorrow:${params.rentalId}:${params.buyerId}`,
    },
    {
      type: "RENTAL_STARTING_SOON" as const,
      userId: params.buyerId,
      runAt: hourBefore,
      dedupeKey: `rental-start-soon:${params.rentalId}:${params.buyerId}`,
    },
    {
      type: "RENTAL_ENDING_SOON" as const,
      userId: params.buyerId,
      runAt: endingSoon,
      dedupeKey: `rental-end-soon:${params.rentalId}:${params.buyerId}`,
    },
    {
      type: "REVIEW_REMINDER" as const,
      userId: params.buyerId,
      runAt: new Date(params.endDate.getTime() + 24 * 60 * 60 * 1000),
      dedupeKey: `review-reminder:${params.rentalId}:${params.buyerId}`,
    },
  ];

  await Promise.all(
    jobs
      .filter((job) => job.runAt.getTime() > Date.now())
      .map((job) =>
        enqueueScheduledJob({
          ...job,
          rentalId: params.rentalId,
          listingId: params.listingId,
          payload: {
            listingTitle: params.listingTitle,
          } as import("@prisma/client").Prisma.InputJsonValue,
        }),
      ),
  );
}
