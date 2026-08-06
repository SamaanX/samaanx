"use server";

import { getServerEnv } from "@/config/env";
import {
  computeLockUntil,
  MAX_PIN_ATTEMPTS,
  requireHmacSecret,
  verifyPinHash,
  verifyQrPayload,
} from "@/domain/verification";
import { scheduleVerificationReadyDelivery } from "@/features/notifications/services/dispatch";
import { buildInAppNotificationData } from "@/features/rentals/services/notifications";
import { getVerificationStatusView } from "@/features/verification/queries/status";
import {
  confirmStageSchema,
  generateVerificationSchema,
  getVerificationStatusSchema,
  regenerateVerificationSchema,
  requestReturnSchema,
  verifyPinSchema,
  verifyQrSchema,
} from "@/features/verification/schemas/verification";
import { createStageVerification } from "@/features/verification/services/create-verification";
import {
  toVerificationActionError,
  verificationConflict,
  verificationNotFound,
  verificationRateLimited,
  verificationValidation,
} from "@/features/verification/services/errors";
import type {
  GenerateVerificationResult,
  VerificationActionResult,
  VerificationStatusView,
} from "@/features/verification/types/verification";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";

/** Live UI syncs via Realtime + client cache — no revalidatePath. */

function wakeRentalParties(
  buyerId: string,
  sellerId: string,
  rentalId: string,
) {
  scheduleLiveSyncAfterResponse([buyerId, sellerId], { rentalId });
}

async function assertParty(rentalId: string, userId: string) {
  const rental = await prisma.rental.findFirst({
    where: {
      id: rentalId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      listing: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!rental) {
    throw verificationNotFound();
  }
  return rental;
}

export async function getVerificationStatusAction(
  input: unknown,
): Promise<VerificationActionResult<VerificationStatusView>> {
  try {
    const { profile } = await requireUser();
    const parsed = getVerificationStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input.",
        },
      };
    }

    const data = await getVerificationStatusView({
      rentalId: parsed.data.rentalId,
      userId: profile.id,
      stage: parsed.data.stage,
    });
    return { ok: true, data };
  } catch (error) {
    logger.error("getVerificationStatusAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function requestReturnAction(
  input: unknown,
): Promise<VerificationActionResult<{ rentalId: string; peerUserId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = requestReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input.",
        },
      };
    }

    const rental = await assertParty(parsed.data.rentalId, profile.id);
    if (rental.buyerId !== profile.id) {
      throw verificationConflict("Only the renter can request a return.");
    }
    if (rental.status !== "ACTIVE" && rental.status !== "RETURN_PENDING") {
      throw verificationConflict(
        "Return can only be requested for an active rental.",
      );
    }

    const existing = await prisma.rentalVerification.findFirst({
      where: {
        rentalId: rental.id,
        stage: "RETURN",
        isCurrent: true,
      },
    });

    // Already in return flow — idempotent success for the buyer CTA.
    if (
      rental.status === "RETURN_PENDING" &&
      existing &&
      !existing.verifiedAt
    ) {
      wakeRentalParties(rental.buyerId, rental.sellerId, rental.id);
      return {
        ok: true,
        data: { rentalId: rental.id, peerUserId: rental.sellerId },
      };
    }

    if (
      existing &&
      !existing.verifiedAt &&
      existing.expiresAt > new Date() &&
      rental.status === "ACTIVE"
    ) {
      await prisma.rental.update({
        where: { id: rental.id },
        data: { status: "RETURN_PENDING" },
      });
      wakeRentalParties(rental.buyerId, rental.sellerId, rental.id);
      return {
        ok: true,
        data: { rentalId: rental.id, peerUserId: rental.sellerId },
      };
    }

    await prisma.$transaction(async (tx) => {
      await createStageVerification({
        tx,
        rentalId: rental.id,
        listingId: rental.listingId,
        listingTitle: rental.listing.title,
        buyerId: rental.buyerId,
        sellerId: rental.sellerId,
        stage: "RETURN",
        notify: false,
      });

      if (rental.status === "ACTIVE") {
        await tx.rental.update({
          where: { id: rental.id },
          data: { status: "RETURN_PENDING" },
        });
      }

      await tx.notification.createMany({
        data: [
          buildInAppNotificationData({
            userId: rental.sellerId,
            type: "VERIFICATION_READY",
            title: "Item Return Requested",
            body: `The renter is ready to return “${rental.listing.title}”. Review and confirm when you receive it.`,
            rentalId: rental.id,
            listingId: rental.listingId,
            payload: {
              rentalId: rental.id,
              stage: "RETURN",
              listingSlug: rental.listing.slug,
            },
          }),
          buildInAppNotificationData({
            userId: rental.buyerId,
            type: "VERIFICATION_READY",
            title: "Return request submitted",
            body: `Waiting for the owner to confirm return of “${rental.listing.title}”. Complete QR/PIN at meetup.`,
            rentalId: rental.id,
            listingId: rental.listingId,
            payload: {
              rentalId: rental.id,
              stage: "RETURN",
              listingSlug: rental.listing.slug,
            },
          }),
        ],
      });
    });
    wakeRentalParties(rental.buyerId, rental.sellerId, rental.id);
    return {
      ok: true,
      data: { rentalId: rental.id, peerUserId: rental.sellerId },
    };
  } catch (error) {
    logger.error("requestReturnAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function generateVerificationAction(
  input: unknown,
): Promise<VerificationActionResult<GenerateVerificationResult>> {
  try {
    const { profile } = await requireUser();
    const parsed = generateVerificationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input.",
        },
      };
    }

    const { rentalId, stage } = parsed.data;
    const rental = await assertParty(rentalId, profile.id);

    if (stage === "HANDOVER") {
      if (
        rental.status !== "APPROVED" &&
        rental.status !== "HANDOVER_PENDING"
      ) {
        throw verificationConflict(
          "Handover codes can only be generated for approved rentals.",
        );
      }
    } else if (
      rental.status !== "ACTIVE" &&
      rental.status !== "RETURN_PENDING"
    ) {
      throw verificationConflict(
        "Return codes can only be generated for active rentals.",
      );
    }

    const existing = await prisma.rentalVerification.findFirst({
      where: { rentalId, stage, isCurrent: true },
    });
    if (existing && !existing.verifiedAt && existing.expiresAt > new Date()) {
      throw verificationConflict(
        "Current codes are still valid. Use regenerate only after expiry.",
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const result = await createStageVerification({
        tx,
        rentalId: rental.id,
        listingId: rental.listingId,
        listingTitle: rental.listing.title,
        buyerId: rental.buyerId,
        sellerId: rental.sellerId,
        stage,
      });

      if (stage === "HANDOVER" && rental.status === "APPROVED") {
        await tx.rental.update({
          where: { id: rental.id },
          data: { status: "HANDOVER_PENDING" },
        });
      }
      if (stage === "RETURN" && rental.status === "ACTIVE") {
        await tx.rental.update({
          where: { id: rental.id },
          data: { status: "RETURN_PENDING" },
        });
      }

      return result;
    });
    wakeRentalParties(rental.buyerId, rental.sellerId, rental.id);
    scheduleVerificationReadyDelivery({
      buyerId: rental.buyerId,
      sellerId: rental.sellerId,
      rentalId: rental.id,
      listingId: rental.listingId,
      listingTitle: rental.listing.title,
      stage,
    });
    return {
      ok: true,
      data: {
        rentalId: rental.id,
        stage,
        verificationId: created.verificationId,
        qrPayload: created.qrPayload,
        pin: created.pin,
        expiresAt: created.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error("generateVerificationAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function regenerateVerificationAction(
  input: unknown,
): Promise<VerificationActionResult<GenerateVerificationResult>> {
  try {
    const { profile } = await requireUser();
    const parsed = regenerateVerificationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input.",
        },
      };
    }

    const { rentalId, stage } = parsed.data;
    const rental = await assertParty(rentalId, profile.id);

    const current = await prisma.rentalVerification.findFirst({
      where: { rentalId, stage, isCurrent: true },
    });

    if (current?.verifiedAt) {
      throw verificationConflict("Verified codes cannot be regenerated.");
    }

    if (
      stage === "HANDOVER" &&
      rental.status !== "APPROVED" &&
      rental.status !== "HANDOVER_PENDING"
    ) {
      throw verificationConflict("Cannot regenerate handover codes now.");
    }
    if (
      stage === "RETURN" &&
      rental.status !== "ACTIVE" &&
      rental.status !== "RETURN_PENDING"
    ) {
      throw verificationConflict("Cannot regenerate return codes now.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const result = await createStageVerification({
        tx,
        rentalId: rental.id,
        listingId: rental.listingId,
        listingTitle: rental.listing.title,
        buyerId: rental.buyerId,
        sellerId: rental.sellerId,
        stage,
      });

      if (stage === "HANDOVER" && rental.status === "APPROVED") {
        await tx.rental.update({
          where: { id: rental.id },
          data: { status: "HANDOVER_PENDING" },
        });
      }
      if (stage === "RETURN" && rental.status === "ACTIVE") {
        await tx.rental.update({
          where: { id: rental.id },
          data: { status: "RETURN_PENDING" },
        });
      }

      return result;
    });
    wakeRentalParties(rental.buyerId, rental.sellerId, rental.id);
    return {
      ok: true,
      data: {
        rentalId: rental.id,
        stage,
        verificationId: created.verificationId,
        qrPayload: created.qrPayload,
        pin: created.pin,
        expiresAt: created.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error("regenerateVerificationAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function verifyQrAction(
  input: unknown,
): Promise<VerificationActionResult<{ verified: true }>> {
  try {
    const { profile } = await requireUser();
    const parsed = verifyQrSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid QR payload.",
        },
      };
    }

    const { rentalId, stage, qrPayload } = parsed.data;
    const rental = await assertParty(rentalId, profile.id);
    const secret = requireHmacSecret(getServerEnv().VERIFICATION_HMAC_SECRET);

    await prisma.$transaction(async (tx) => {
      const verification = await tx.rentalVerification.findFirst({
        where: { rentalId, stage, isCurrent: true },
      });
      if (!verification) {
        throw verificationNotFound();
      }
      if (verification.verifiedAt) {
        throw verificationConflict("Already verified.");
      }
      if (verification.expiresAt.getTime() < Date.now()) {
        throw verificationConflict(
          "Codes have expired. Regenerate and try again.",
        );
      }
      if (
        verification.lockedUntil &&
        verification.lockedUntil.getTime() > Date.now()
      ) {
        throw verificationRateLimited(
          "Too many failed attempts. Try again after the lockout.",
        );
      }

      const ok = verifyQrPayload({
        secret,
        qrPayload,
        expectedVerificationId: verification.id,
        stage,
      });

      if (!ok) {
        const attempts = verification.failedAttempts + 1;
        const locked = attempts >= MAX_PIN_ATTEMPTS ? computeLockUntil() : null;
        await tx.rentalVerification.update({
          where: { id: verification.id },
          data: {
            failedAttempts: attempts,
            lockedUntil: locked,
          },
        });
        if (locked) {
          throw verificationRateLimited(
            "Too many failed attempts. Locked for 15 minutes.",
          );
        }
        throw verificationValidation("Invalid or tampered QR code.");
      }

      const rental = await tx.rental.findUniqueOrThrow({
        where: { id: rentalId },
      });

      const markVerified = await tx.rentalVerification.updateMany({
        where: {
          id: verification.id,
          verifiedAt: null,
        },
        data: {
          verifiedAt: new Date(),
          verifiedById: profile.id,
          verifiedMethod: "QR",
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      if (markVerified.count === 0) {
        throw verificationConflict("Already verified.");
      }

      if (stage === "HANDOVER" && rental.status === "APPROVED") {
        await tx.rental.update({
          where: { id: rentalId },
          data: { status: "HANDOVER_PENDING" },
        });
      }
      if (stage === "RETURN" && rental.status === "ACTIVE") {
        await tx.rental.update({
          where: { id: rentalId },
          data: { status: "RETURN_PENDING" },
        });
      }
    });
    wakeRentalParties(rental.buyerId, rental.sellerId, rentalId);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    logger.error("verifyQrAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function verifyPinAction(
  input: unknown,
): Promise<VerificationActionResult<{ verified: true }>> {
  try {
    const { profile } = await requireUser();
    const parsed = verifyPinSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid PIN.",
        },
      };
    }

    const { rentalId, stage, pin } = parsed.data;
    const rentalParty = await assertParty(rentalId, profile.id);

    await prisma.$transaction(async (tx) => {
      const verification = await tx.rentalVerification.findFirst({
        where: { rentalId, stage, isCurrent: true },
      });
      if (!verification) {
        throw verificationNotFound();
      }
      if (verification.verifiedAt) {
        throw verificationConflict("Already verified.");
      }
      if (verification.expiresAt.getTime() < Date.now()) {
        throw verificationConflict(
          "Codes have expired. Regenerate and try again.",
        );
      }
      if (
        verification.lockedUntil &&
        verification.lockedUntil.getTime() > Date.now()
      ) {
        throw verificationRateLimited(
          "Too many failed attempts. Try again after the lockout.",
        );
      }

      const ok = verifyPinHash(pin, verification.pinHash);
      if (!ok) {
        const attempts = verification.failedAttempts + 1;
        const locked = attempts >= MAX_PIN_ATTEMPTS ? computeLockUntil() : null;
        await tx.rentalVerification.update({
          where: { id: verification.id },
          data: {
            failedAttempts: attempts,
            lockedUntil: locked,
          },
        });
        if (locked) {
          throw verificationRateLimited(
            "Too many failed attempts. Locked for 15 minutes.",
          );
        }
        throw verificationValidation(
          `Incorrect PIN. ${MAX_PIN_ATTEMPTS - attempts} attempt(s) left.`,
        );
      }

      const rental = await tx.rental.findUniqueOrThrow({
        where: { id: rentalId },
      });

      const markVerified = await tx.rentalVerification.updateMany({
        where: {
          id: verification.id,
          verifiedAt: null,
        },
        data: {
          verifiedAt: new Date(),
          verifiedById: profile.id,
          verifiedMethod: "PIN",
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      if (markVerified.count === 0) {
        throw verificationConflict("Already verified.");
      }

      if (stage === "HANDOVER" && rental.status === "APPROVED") {
        await tx.rental.update({
          where: { id: rentalId },
          data: { status: "HANDOVER_PENDING" },
        });
      }
      if (stage === "RETURN" && rental.status === "ACTIVE") {
        await tx.rental.update({
          where: { id: rentalId },
          data: { status: "RETURN_PENDING" },
        });
      }
    });
    wakeRentalParties(rentalParty.buyerId, rentalParty.sellerId, rentalId);
    return { ok: true, data: { verified: true } };
  } catch (error) {
    logger.error("verifyPinAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}

export async function confirmStageAction(input: unknown): Promise<
  VerificationActionResult<{
    bothConfirmed: boolean;
    nextStatus: string;
  }>
> {
  try {
    const { profile } = await requireUser();
    const parsed = confirmStageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input.",
        },
      };
    }

    const { rentalId, stage } = parsed.data;
    const rental = await assertParty(rentalId, profile.id);
    const isBuyer = rental.buyerId === profile.id;

    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.rentalVerification.findFirst({
        where: { rentalId, stage, isCurrent: true },
      });
      if (!verification?.verifiedAt) {
        throw verificationConflict(
          "Verify QR or PIN before confirming this stage.",
        );
      }

      const confirmation = await tx.rentalConfirmation.findUnique({
        where: { rentalId_stage: { rentalId, stage } },
      });
      if (!confirmation) {
        throw verificationNotFound();
      }

      await tx.rentalConfirmation.update({
        where: { id: confirmation.id },
        data: isBuyer
          ? {
              buyerConfirmed: true,
              buyerConfirmedAt: confirmation.buyerConfirmedAt ?? new Date(),
            }
          : {
              sellerConfirmed: true,
              sellerConfirmedAt: confirmation.sellerConfirmedAt ?? new Date(),
            },
      });

      const fresh = await tx.rentalConfirmation.findUniqueOrThrow({
        where: { id: confirmation.id },
      });
      const bothConfirmed = fresh.buyerConfirmed && fresh.sellerConfirmed;
      let nextStatus = rental.status;

      if (
        stage === "RETURN" &&
        !bothConfirmed &&
        ((isBuyer && !confirmation.buyerConfirmed) ||
          (!isBuyer && !confirmation.sellerConfirmed))
      ) {
        const otherUserId = isBuyer ? rental.sellerId : rental.buyerId;
        await tx.notification.create({
          data: buildInAppNotificationData({
            userId: otherUserId,
            type: "VERIFICATION_READY",
            title: isBuyer
              ? "Return waiting for your confirmation"
              : "Seller confirmed return",
            body: isBuyer
              ? `The renter confirmed return of “${rental.listing.title}”. Confirm when you have received the item.`
              : `The owner confirmed receiving “${rental.listing.title}”. Confirm on your side to finish.`,
            rentalId,
            listingId: rental.listingId,
            payload: {
              rentalId,
              stage: "RETURN",
              listingSlug: rental.listing.slug,
            },
          }),
        });
      }

      if (bothConfirmed && !fresh.completedAt) {
        await tx.rentalConfirmation.update({
          where: { id: fresh.id },
          data: { completedAt: new Date() },
        });

        if (stage === "HANDOVER") {
          await tx.rental.update({
            where: { id: rentalId },
            data: {
              status: "ACTIVE",
              activatedAt: new Date(),
            },
          });
          nextStatus = "ACTIVE";

          await tx.notification.createMany({
            data: [
              buildInAppNotificationData({
                userId: rental.buyerId,
                type: "HANDOVER_COMPLETED",
                title: "Handover complete",
                body: `“${rental.listing.title}” is now active. Enjoy your rental.`,
                rentalId,
                listingId: rental.listingId,
                payload: { rentalId },
              }),
              buildInAppNotificationData({
                userId: rental.sellerId,
                type: "HANDOVER_COMPLETED",
                title: "Handover complete",
                body: `Handover for “${rental.listing.title}” is confirmed. Rental is active.`,
                rentalId,
                listingId: rental.listingId,
                payload: { rentalId },
              }),
            ],
          });
        } else {
          await tx.rental.update({
            where: { id: rentalId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });
          nextStatus = "COMPLETED";

          await tx.profile.updateMany({
            where: { id: { in: [rental.buyerId, rental.sellerId] } },
            data: { completedRentalsCount: { increment: 1 } },
          });

          await tx.notification.createMany({
            data: [
              buildInAppNotificationData({
                userId: rental.buyerId,
                type: "RETURN_COMPLETED",
                title: "Rental completed",
                body: `Return of “${rental.listing.title}” is complete. Thank you!`,
                rentalId,
                listingId: rental.listingId,
                payload: {
                  rentalId,
                  stage: "RETURN",
                  listingSlug: rental.listing.slug,
                },
              }),
              buildInAppNotificationData({
                userId: rental.sellerId,
                type: "RETURN_COMPLETED",
                title: "Rental completed",
                body: `Return of “${rental.listing.title}” is complete. Your item is back.`,
                rentalId,
                listingId: rental.listingId,
                payload: {
                  rentalId,
                  stage: "RETURN",
                  listingSlug: rental.listing.slug,
                },
              }),
              buildInAppNotificationData({
                userId: rental.buyerId,
                type: "REVIEW_REMINDER",
                title: "Leave a review",
                body: `How was renting “${rental.listing.title}”? Leave a quick review.`,
                rentalId,
                listingId: rental.listingId,
                payload: {
                  rentalId,
                  listingSlug: rental.listing.slug,
                },
              }),
              buildInAppNotificationData({
                userId: rental.sellerId,
                type: "REVIEW_REMINDER",
                title: "Leave a review",
                body: `How was renting with this buyer for “${rental.listing.title}”?`,
                rentalId,
                listingId: rental.listingId,
                payload: {
                  rentalId,
                  listingSlug: rental.listing.slug,
                },
              }),
            ],
          });
        }
      }

      return { bothConfirmed, nextStatus };
    });
    wakeRentalParties(rental.buyerId, rental.sellerId, rentalId);
    return { ok: true, data: result };
  } catch (error) {
    logger.error("confirmStageAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toVerificationActionError(error) };
  }
}
