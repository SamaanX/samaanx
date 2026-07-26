import type { Prisma, VerificationStage } from "@prisma/client";

import { getServerEnv } from "@/config/env";
import {
  buildQrPayload,
  computeExpiresAt,
  derivePin,
  hashPin,
  newVerificationId,
  requireHmacSecret,
} from "@/domain/verification";
import { buildInAppNotificationData } from "@/features/rentals/services/notifications";

type Tx = Prisma.TransactionClient;

export async function createStageVerification(params: {
  tx: Tx;
  rentalId: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  sellerId: string;
  stage: VerificationStage;
  notify?: boolean;
}): Promise<{
  verificationId: string;
  qrPayload: string;
  pin: string;
  expiresAt: Date;
}> {
  const secret = requireHmacSecret(getServerEnv().VERIFICATION_HMAC_SECRET);
  const verificationId = newVerificationId();
  const generatedAt = new Date();
  const expiresAt = computeExpiresAt(generatedAt);
  const pin = derivePin(secret, verificationId);
  const pinHash = hashPin(pin);
  const { qrPayload, qrHash } = buildQrPayload({
    secret,
    verificationId,
    expiresAt,
    stage: params.stage,
  });

  await params.tx.rentalVerification.updateMany({
    where: {
      rentalId: params.rentalId,
      stage: params.stage,
      isCurrent: true,
    },
    data: { isCurrent: false },
  });

  await params.tx.rentalVerification.create({
    data: {
      id: verificationId,
      rentalId: params.rentalId,
      stage: params.stage,
      qrPayload,
      qrHash,
      pinHash,
      generatedAt,
      expiresAt,
      failedAttempts: 0,
      lockedUntil: null,
      isCurrent: true,
    },
  });

  await params.tx.rentalConfirmation.upsert({
    where: {
      rentalId_stage: {
        rentalId: params.rentalId,
        stage: params.stage,
      },
    },
    create: {
      rentalId: params.rentalId,
      stage: params.stage,
      buyerConfirmed: false,
      sellerConfirmed: false,
    },
    update: {
      buyerConfirmed: false,
      sellerConfirmed: false,
      buyerConfirmedAt: null,
      sellerConfirmedAt: null,
      completedAt: null,
    },
  });

  if (params.notify !== false) {
    const stageLabel = params.stage === "HANDOVER" ? "handover" : "return";
    await params.tx.notification.createMany({
      data: [
        buildInAppNotificationData({
          userId: params.buyerId,
          type: "VERIFICATION_READY",
          title: `${params.stage === "HANDOVER" ? "Handover" : "Return"} codes ready`,
          body: `Verification codes for “${params.listingTitle}” ${stageLabel} are ready.`,
          rentalId: params.rentalId,
          listingId: params.listingId,
          payload: { rentalId: params.rentalId, stage: params.stage },
        }),
        buildInAppNotificationData({
          userId: params.sellerId,
          type: "VERIFICATION_READY",
          title: `${params.stage === "HANDOVER" ? "Handover" : "Return"} codes ready`,
          body: `Verification codes for “${params.listingTitle}” ${stageLabel} are ready.`,
          rentalId: params.rentalId,
          listingId: params.listingId,
          payload: { rentalId: params.rentalId, stage: params.stage },
        }),
      ],
    });
  }

  return { verificationId, qrPayload, pin, expiresAt };
}
