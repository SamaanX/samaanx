import type { VerificationStage } from "@prisma/client";

import { getServerEnv } from "@/config/env";
import {
  derivePin,
  MAX_PIN_ATTEMPTS,
  requireHmacSecret,
} from "@/domain/verification";
import {
  verificationForbidden,
  verificationNotFound,
} from "@/features/verification/services/errors";
import type { VerificationStatusView } from "@/features/verification/types/verification";
import { prisma } from "@/lib/db/prisma";

export async function loadRentalForParty(rentalId: string, userId: string) {
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

  const role: "buyer" | "seller" =
    rental.buyerId === userId ? "buyer" : "seller";

  return { rental, role };
}

export async function getVerificationStatusView(params: {
  rentalId: string;
  userId: string;
  stage: VerificationStage;
}): Promise<VerificationStatusView> {
  const { rental, role } = await loadRentalForParty(
    params.rentalId,
    params.userId,
  );

  if (rental.buyerId !== params.userId && rental.sellerId !== params.userId) {
    throw verificationForbidden();
  }

  const [verification, confirmation] = await Promise.all([
    prisma.rentalVerification.findFirst({
      where: {
        rentalId: params.rentalId,
        stage: params.stage,
        isCurrent: true,
      },
    }),
    prisma.rentalConfirmation.findUnique({
      where: {
        rentalId_stage: {
          rentalId: params.rentalId,
          stage: params.stage,
        },
      },
    }),
  ]);

  const now = Date.now();
  const isExpired = verification
    ? verification.expiresAt.getTime() < now
    : false;
  const isLocked = Boolean(
    verification?.lockedUntil && verification.lockedUntil.getTime() > now,
  );
  const isVerified = Boolean(verification?.verifiedAt);

  let pin: string | null = null;
  if (verification && !isVerified) {
    const secret = requireHmacSecret(getServerEnv().VERIFICATION_HMAC_SECRET);
    pin = derivePin(secret, verification.id);
  }

  const buyerConfirmed = confirmation?.buyerConfirmed ?? false;
  const sellerConfirmed = confirmation?.sellerConfirmed ?? false;
  const youConfirmed = role === "buyer" ? buyerConfirmed : sellerConfirmed;
  const bothConfirmed = buyerConfirmed && sellerConfirmed;

  const canRegenerate =
    Boolean(verification) &&
    !isVerified &&
    (isExpired ||
      rental.status === "HANDOVER_PENDING" ||
      rental.status === "RETURN_PENDING" ||
      rental.status === "APPROVED" ||
      rental.status === "ACTIVE");

  const canVerify =
    Boolean(verification) &&
    !isVerified &&
    !isExpired &&
    !isLocked &&
    (params.stage === "HANDOVER"
      ? rental.status === "HANDOVER_PENDING" || rental.status === "APPROVED"
      : rental.status === "RETURN_PENDING" || rental.status === "ACTIVE");

  const canConfirm =
    isVerified &&
    !bothConfirmed &&
    !youConfirmed &&
    (params.stage === "HANDOVER"
      ? rental.status === "HANDOVER_PENDING"
      : rental.status === "RETURN_PENDING");

  return {
    rentalId: rental.id,
    listingTitle: rental.listing.title,
    listingSlug: rental.listing.slug,
    stage: params.stage,
    rentalStatus: rental.status,
    role,
    peerUserId: role === "buyer" ? rental.sellerId : rental.buyerId,
    verificationId: verification?.id ?? null,
    qrPayload: verification && !isVerified ? verification.qrPayload : null,
    pin,
    expiresAt: verification?.expiresAt.toISOString() ?? null,
    generatedAt: verification?.generatedAt.toISOString() ?? null,
    isExpired,
    isLocked,
    lockedUntil: verification?.lockedUntil?.toISOString() ?? null,
    failedAttempts: verification?.failedAttempts ?? 0,
    maxAttempts: MAX_PIN_ATTEMPTS,
    isVerified,
    verifiedAt: verification?.verifiedAt?.toISOString() ?? null,
    verifiedMethod: verification?.verifiedMethod ?? null,
    buyerConfirmed,
    sellerConfirmed,
    youConfirmed,
    bothConfirmed,
    confirmationCompletedAt: confirmation?.completedAt?.toISOString() ?? null,
    canRegenerate: Boolean(canRegenerate && !isVerified),
    canVerify: Boolean(canVerify),
    canConfirm: Boolean(canConfirm),
  };
}
