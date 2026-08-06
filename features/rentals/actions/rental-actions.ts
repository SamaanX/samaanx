"use server";

import { after } from "next/server";

import { parseDateOnly } from "@/domain/rental";
import { scheduleRentalReminderJobs } from "@/features/jobs/scheduler";
import {
  notifyParamsToDeliveryEvent,
  scheduleChannelDelivery,
  scheduleVerificationReadyDelivery,
} from "@/features/notifications/services/dispatch";
import {
  cancelRentalRequestSchema,
  createRentalRequestSchema,
  rejectRentalRequestSchema,
} from "@/features/rentals/schemas/rental";
import { assertListingDatesBookable } from "@/features/rentals/services/availability";
import { buildInAppNotificationData } from "@/features/rentals/services/notifications";
import {
  rentalConflict,
  rentalForbidden,
  rentalNotFound,
  toRentalActionError,
} from "@/features/rentals/services/rental-errors";
import type { RentalActionResult } from "@/features/rentals/types/rental";
import {
  recomputeCancellationRate,
  updateSellerResponseTime,
} from "@/features/trust/services/trust-metrics";
import { createStageVerification } from "@/features/verification/services/create-verification";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";

/** Live UI syncs via Realtime + client cache — no revalidatePath (avoids full layout refresh). */

export async function createRentalRequestAction(input: unknown): Promise<
  RentalActionResult<{
    rentalId: string;
    conversationId: string;
    sellerId: string;
    buyerId: string;
  }>
> {
  try {
    const { profile } = await requireUser();
    const parsed = createRentalRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
      };
    }

    const { listingId, startDate, endDate } = parsed.data;
    const messageToSeller = parsed.data.messageToSeller?.trim()
      ? parsed.data.messageToSeller.trim()
      : null;

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        sellerId: true,
        rentPriceAmount: true,
        rentPriceUnit: true,
        currency: true,
        depositType: true,
        depositAmount: true,
        depositPercent: true,
      },
    });

    if (!listing || listing.status !== "ACTIVE") {
      throw rentalNotFound();
    }

    if (listing.sellerId === profile.id) {
      throw rentalForbidden("You cannot rent your own listing.");
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertListingDatesBookable({
        listingId: listing.id,
        startDate,
        endDate,
        tx,
      });

      const rental = await tx.rental.create({
        data: {
          listingId: listing.id,
          buyerId: profile.id,
          sellerId: listing.sellerId,
          status: "REQUESTED",
          startDate: parseDateOnly(startDate),
          endDate: parseDateOnly(endDate),
          messageToSeller,
          currency: listing.currency,
          rentPriceAmount: listing.rentPriceAmount,
          rentPriceUnit: listing.rentPriceUnit,
          depositType: listing.depositType,
          depositAmount: listing.depositAmount,
          depositPercent: listing.depositPercent,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          rentalId: rental.id,
          buyerId: profile.id,
          sellerId: listing.sellerId,
          isReadonly: false,
        },
      });

      await tx.listing.update({
        where: { id: listing.id },
        data: { requestCount: { increment: 1 } },
      });

      await tx.notification.createMany({
        data: [
          buildInAppNotificationData({
            userId: listing.sellerId,
            type: "RENTAL_REQUESTED",
            title: "New rental request",
            body: `${profile.displayName} requested “${listing.title}” (${startDate} → ${endDate}).`,
            rentalId: rental.id,
            listingId: listing.id,
            payload: { rentalId: rental.id, listingSlug: listing.slug },
          }),
          buildInAppNotificationData({
            userId: profile.id,
            type: "RENTAL_REQUESTED",
            title: "Request submitted",
            body: `Your request for “${listing.title}” was sent to the seller.`,
            rentalId: rental.id,
            listingId: listing.id,
            payload: { rentalId: rental.id, listingSlug: listing.slug },
          }),
        ],
      });

      return {
        rentalId: rental.id,
        conversationId: conversation.id,
        sellerId: listing.sellerId,
        buyerId: profile.id,
      };
    });

    scheduleLiveSyncAfterResponse([result.sellerId, result.buyerId], {
      rentalId: result.rentalId,
    });
    scheduleChannelDelivery([
      notifyParamsToDeliveryEvent({
        userId: listing.sellerId,
        type: "RENTAL_REQUESTED",
        title: "New rental request",
        body: `${profile.displayName} requested “${listing.title}” (${startDate} → ${endDate}).`,
        rentalId: result.rentalId,
        listingId: listing.id,
      }),
      notifyParamsToDeliveryEvent({
        userId: profile.id,
        type: "RENTAL_REQUESTED",
        title: "Request submitted",
        body: `Your request for “${listing.title}” was sent to the seller.`,
        rentalId: result.rentalId,
        listingId: listing.id,
      }),
    ]);
    return { ok: true, data: result };
  } catch (error) {
    logger.error("createRentalRequestAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}

export async function approveRentalRequestAction(
  rentalId: string,
): Promise<RentalActionResult<{ rentalId: string; peerUserId: string }>> {
  try {
    const { profile } = await requireUser();

    const rental = await prisma.rental.findFirst({
      where: { id: rentalId },
      include: {
        listing: {
          select: { id: true, slug: true, title: true, sellerId: true },
        },
      },
    });

    if (!rental) {
      throw rentalNotFound();
    }
    if (rental.sellerId !== profile.id) {
      throw rentalForbidden("Only the listing owner can approve requests.");
    }
    if (rental.status !== "REQUESTED") {
      throw rentalConflict("Only pending requests can be approved.");
    }

    const startDate = rental.startDate.toISOString().slice(0, 10);
    const endDate = rental.endDate.toISOString().slice(0, 10);

    await prisma.$transaction(async (tx) => {
      await assertListingDatesBookable({
        listingId: rental.listingId,
        startDate,
        endDate,
        excludeRentalId: rental.id,
        tx,
      });

      const updated = await tx.rental.updateMany({
        where: { id: rental.id, status: "REQUESTED", sellerId: profile.id },
        data: {
          status: "HANDOVER_PENDING",
          approvedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw rentalConflict(
          "Request could not be approved. It may have changed.",
        );
      }

      await createStageVerification({
        tx,
        rentalId: rental.id,
        listingId: rental.listingId,
        listingTitle: rental.listing.title,
        buyerId: rental.buyerId,
        sellerId: rental.sellerId,
        stage: "HANDOVER",
      });

      await tx.notification.create({
        data: buildInAppNotificationData({
          userId: rental.buyerId,
          type: "RENTAL_APPROVED",
          title: "Request approved",
          body: `Your request for “${rental.listing.title}” was approved. Handover codes are ready.`,
          rentalId: rental.id,
          listingId: rental.listingId,
          payload: { rentalId: rental.id, listingSlug: rental.listing.slug },
        }),
      });

      const responseMinutes = Math.max(
        1,
        (Date.now() - rental.createdAt.getTime()) / 60_000,
      );
      await updateSellerResponseTime({
        sellerId: profile.id,
        responseMinutes,
        tx,
      });
    });

    scheduleLiveSyncAfterResponse([rental.buyerId, rental.sellerId], {
      rentalId: rental.id,
    });
    scheduleChannelDelivery([
      notifyParamsToDeliveryEvent({
        userId: rental.buyerId,
        type: "RENTAL_APPROVED",
        title: "Request approved",
        body: `Your request for “${rental.listing.title}” was approved. Handover codes are ready.`,
        rentalId: rental.id,
        listingId: rental.listingId,
      }),
    ]);
    scheduleVerificationReadyDelivery({
      buyerId: rental.buyerId,
      sellerId: rental.sellerId,
      rentalId: rental.id,
      listingId: rental.listingId,
      listingTitle: rental.listing.title,
      stage: "HANDOVER",
    });
    after(() => {
      void scheduleRentalReminderJobs({
        rentalId: rental.id,
        buyerId: rental.buyerId,
        sellerId: rental.sellerId,
        listingId: rental.listingId,
        listingTitle: rental.listing.title,
        startDate: rental.startDate,
        endDate: rental.endDate,
      });
    });
    return {
      ok: true,
      data: { rentalId: rental.id, peerUserId: rental.buyerId },
    };
  } catch (error) {
    logger.error("approveRentalRequestAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}

export async function rejectRentalRequestAction(
  input: unknown,
): Promise<RentalActionResult<{ rentalId: string; peerUserId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = rejectRentalRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid rejection.",
        },
      };
    }

    const rental = await prisma.rental.findFirst({
      where: { id: parsed.data.rentalId },
      include: {
        listing: { select: { slug: true, title: true } },
        conversation: { select: { id: true } },
      },
    });

    if (!rental) {
      throw rentalNotFound();
    }
    if (rental.sellerId !== profile.id) {
      throw rentalForbidden("Only the listing owner can reject requests.");
    }
    if (rental.status !== "REQUESTED") {
      throw rentalConflict("Only pending requests can be rejected.");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.rental.updateMany({
        where: { id: rental.id, status: "REQUESTED", sellerId: profile.id },
        data: {
          status: "REJECTED",
          rejectionReason: parsed.data.reason,
        },
      });

      if (updated.count !== 1) {
        throw rentalConflict(
          "Request could not be rejected. It may have changed.",
        );
      }

      if (rental.conversation) {
        await tx.conversation.update({
          where: { id: rental.conversation.id },
          data: { isReadonly: true },
        });
      }

      await tx.notification.create({
        data: buildInAppNotificationData({
          userId: rental.buyerId,
          type: "RENTAL_REJECTED",
          title: "Request rejected",
          body: `Your request for “${rental.listing.title}” was rejected.`,
          rentalId: rental.id,
          listingId: rental.listingId,
          payload: {
            rentalId: rental.id,
            listingSlug: rental.listing.slug,
            reason: parsed.data.reason,
          },
        }),
      });
    });

    scheduleLiveSyncAfterResponse([rental.buyerId, rental.sellerId], {
      rentalId: rental.id,
    });
    scheduleChannelDelivery([
      notifyParamsToDeliveryEvent({
        userId: rental.buyerId,
        type: "RENTAL_REJECTED",
        title: "Request rejected",
        body: `Your request for “${rental.listing.title}” was rejected.`,
        rentalId: rental.id,
        listingId: rental.listingId,
      }),
    ]);
    return {
      ok: true,
      data: { rentalId: rental.id, peerUserId: rental.buyerId },
    };
  } catch (error) {
    logger.error("rejectRentalRequestAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}

export async function cancelRentalRequestAction(
  input: unknown,
): Promise<RentalActionResult<{ rentalId: string; peerUserId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = cancelRentalRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid cancellation.",
        },
      };
    }

    const rental = await prisma.rental.findFirst({
      where: { id: parsed.data.rentalId },
      include: {
        listing: { select: { slug: true, title: true } },
        conversation: { select: { id: true } },
      },
    });

    if (!rental) {
      throw rentalNotFound();
    }

    const isBuyer = rental.buyerId === profile.id;
    const isSeller = rental.sellerId === profile.id;
    if (!isBuyer && !isSeller) {
      throw rentalForbidden();
    }

    if (
      rental.status !== "REQUESTED" &&
      rental.status !== "APPROVED" &&
      rental.status !== "HANDOVER_PENDING"
    ) {
      throw rentalConflict("This rental can no longer be cancelled.");
    }

    if (rental.status === "REQUESTED" && !isBuyer) {
      throw rentalForbidden("Sellers should reject pending requests instead.");
    }

    const reason = parsed.data.reason?.trim()
      ? parsed.data.reason.trim()
      : null;
    const notifyUserId = isBuyer ? rental.sellerId : rental.buyerId;

    await prisma.$transaction(async (tx) => {
      const updated = await tx.rental.updateMany({
        where: {
          id: rental.id,
          status: { in: ["REQUESTED", "APPROVED", "HANDOVER_PENDING"] },
        },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancelledById: profile.id,
        },
      });

      if (updated.count !== 1) {
        throw rentalConflict(
          "Rental could not be cancelled. It may have changed.",
        );
      }

      if (rental.conversation) {
        await tx.conversation.update({
          where: { id: rental.conversation.id },
          data: { isReadonly: true },
        });
      }

      await tx.notification.create({
        data: buildInAppNotificationData({
          userId: notifyUserId,
          type: "RENTAL_CANCELLED",
          title: "Rental cancelled",
          body: `The rental for “${rental.listing.title}” was cancelled.`,
          rentalId: rental.id,
          listingId: rental.listingId,
          payload: { rentalId: rental.id, listingSlug: rental.listing.slug },
        }),
      });

      await recomputeCancellationRate(rental.buyerId, tx);
      await recomputeCancellationRate(rental.sellerId, tx);
    });

    scheduleLiveSyncAfterResponse([rental.buyerId, rental.sellerId], {
      rentalId: rental.id,
    });
    scheduleChannelDelivery([
      notifyParamsToDeliveryEvent({
        userId: notifyUserId,
        type: "RENTAL_CANCELLED",
        title: "Rental cancelled",
        body: `The rental for “${rental.listing.title}” was cancelled.`,
        rentalId: rental.id,
        listingId: rental.listingId,
      }),
    ]);
    return {
      ok: true,
      data: { rentalId: rental.id, peerUserId: notifyUserId },
    };
  } catch (error) {
    logger.error("cancelRentalRequestAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}
