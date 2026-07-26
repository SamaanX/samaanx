import type { ScheduledJob } from "@prisma/client";

import { enqueueScheduledJob as enqueueJob } from "@/features/jobs/scheduler";
import {
  notifyParamsToDeliveryEvent,
  scheduleChannelDelivery,
} from "@/features/notifications/services/dispatch";
import { buildInAppNotificationData } from "@/features/rentals/services/notifications";
import { prisma } from "@/lib/db/prisma";
import { sendBrandedEmail } from "@/lib/email/send";
import { buildWelcomeEmail } from "@/lib/email/types";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 20;

export async function processDueScheduledJobs(): Promise<{
  processed: number;
  failed: number;
}> {
  const now = new Date();
  const jobs = await prisma.scheduledJob.findMany({
    where: { status: "PENDING", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const claimed = await prisma.scheduledJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "RUNNING", attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;

    try {
      await executeJob(job);
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", lastError: null },
      });
      processed += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "unknown_job_error";
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: job.attempts >= 3 ? "FAILED" : "PENDING",
          lastError: message,
          runAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      logger.error("scheduled job failed", { jobId: job.id, message });
    }
  }

  return { processed, failed };
}

async function executeJob(job: ScheduledJob): Promise<void> {
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const listingTitle =
    typeof payload.listingTitle === "string"
      ? payload.listingTitle
      : "your rental";

  const profile = await prisma.profile.findUnique({
    where: { id: job.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      notifyEmailEnabled: true,
      notifyRentalEnabled: true,
      notifyWeeklyDigestEnabled: true,
      notifyMarketingEnabled: true,
    },
  });
  if (!profile) return;

  switch (job.type) {
    case "RENTAL_STARTING_TOMORROW": {
      await createSystemInApp({
        userId: profile.id,
        title: "Rental starts tomorrow",
        body: `Your rental for “${listingTitle}” starts tomorrow. Prepare for handover if needed.`,
        rentalId: job.rentalId,
        listingId: job.listingId,
      });
      break;
    }
    case "RENTAL_STARTING_SOON": {
      await createSystemInApp({
        userId: profile.id,
        title: "Rental starts in 1 hour",
        body: `Your rental for “${listingTitle}” starts soon.`,
        rentalId: job.rentalId,
        listingId: job.listingId,
      });
      break;
    }
    case "RENTAL_ENDING_SOON": {
      await createSystemInApp({
        userId: profile.id,
        title: "Rental ending soon",
        body: `Your rental for “${listingTitle}” ends soon. Plan your return.`,
        rentalId: job.rentalId,
        listingId: job.listingId,
      });
      break;
    }
    case "RETURN_OVERDUE": {
      await createSystemInApp({
        userId: profile.id,
        title: "Return overdue",
        body: `The return for “${listingTitle}” is overdue. Open the rental to finish return verification.`,
        rentalId: job.rentalId,
        listingId: job.listingId,
      });
      break;
    }
    case "CHAT_UNREAD_REMINDER": {
      await createSystemInApp({
        userId: profile.id,
        title: "Unread messages",
        body: "You have unread chat messages waiting on SamaanX.",
        rentalId: null,
        listingId: null,
      });
      break;
    }
    case "LISTING_INACTIVE": {
      await createSystemInApp({
        userId: profile.id,
        title: "Listing inactive",
        body: `Your listing “${listingTitle}” has been inactive. Consider updating availability.`,
        rentalId: null,
        listingId: job.listingId,
      });
      break;
    }
    case "WEEKLY_SELLER_SUMMARY":
    case "WEEKLY_BUYER_DIGEST": {
      if (
        job.type === "WEEKLY_SELLER_SUMMARY" ||
        profile.notifyWeeklyDigestEnabled
      ) {
        await createSystemInApp({
          userId: profile.id,
          title:
            job.type === "WEEKLY_SELLER_SUMMARY"
              ? "Weekly seller summary"
              : "Weekly recommendations",
          body:
            job.type === "WEEKLY_SELLER_SUMMARY"
              ? "Your weekly seller activity summary is ready on SamaanX."
              : "Fresh listings near you — open SamaanX to explore this week’s picks.",
          rentalId: null,
          listingId: null,
        });
      }
      break;
    }
    case "REVIEW_REMINDER": {
      if (!job.rentalId || !job.listingId) return;
      const data = buildInAppNotificationData({
        userId: profile.id,
        type: "REVIEW_REMINDER",
        title: "Leave a review",
        body: `How was your experience with “${listingTitle}”?`,
        rentalId: job.rentalId,
        listingId: job.listingId,
      });
      await prisma.notification.create({ data });
      scheduleChannelDelivery([
        notifyParamsToDeliveryEvent({
          userId: profile.id,
          type: "REVIEW_REMINDER",
          title: "Leave a review",
          body: `How was your experience with “${listingTitle}”?`,
          rentalId: job.rentalId,
          listingId: job.listingId,
        }),
      ]);
      break;
    }
    default:
      break;
  }
}

async function createSystemInApp(params: {
  userId: string;
  title: string;
  body: string;
  rentalId: string | null;
  listingId: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: "SYSTEM",
      channel: "IN_APP",
      status: "SENT",
      title: params.title,
      body: params.body,
      rentalId: params.rentalId,
      listingId: params.listingId,
      deliveredAt: new Date(),
      sentAt: new Date(),
    },
  });
}

export async function enqueueWeeklyDigestJobs(): Promise<number> {
  const profiles = await prisma.profile.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      notifyWeeklyDigestEnabled: true,
    },
    select: { id: true, preferredMode: true },
    take: 500,
  });

  const runAt = new Date();
  runAt.setHours(runAt.getHours() + 1);

  await Promise.all(
    profiles.map((profile) =>
      enqueueJob({
        type:
          profile.preferredMode === "SELLER"
            ? "WEEKLY_SELLER_SUMMARY"
            : "WEEKLY_BUYER_DIGEST",
        userId: profile.id,
        runAt,
        dedupeKey: `weekly:${profile.id}:${runAt.toISOString().slice(0, 10)}`,
      }),
    ),
  );

  return profiles.length;
}

export async function sendWelcomeEmailForUser(params: {
  userId: string;
  email: string;
  displayName: string;
}): Promise<void> {
  const content = buildWelcomeEmail(params.displayName);
  await sendBrandedEmail({
    userId: params.userId,
    to: params.email,
    displayName: params.displayName,
    dedupeKey: `welcome:${params.userId}`,
    ...content,
  });
}
