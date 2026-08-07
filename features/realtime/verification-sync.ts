import type { VerificationStage } from "@prisma/client";

/** Minimal verification state sent over live-sync so peers update without a full refetch. */
export type LiveSyncVerificationPatch = {
  stage: VerificationStage;
  buyerConfirmed?: boolean;
  sellerConfirmed?: boolean;
  bothConfirmed?: boolean;
  rentalStatus?: string;
  isVerified?: boolean;
  verifiedMethod?: "QR" | "PIN" | null;
  canVerify?: boolean;
};

export const VERIFICATION_SYNC_EVENT = "samaanx:verification-sync";

export type VerificationSyncEventDetail = {
  rentalId: string;
} & LiveSyncVerificationPatch;

export function dispatchVerificationSync(
  rentalId: string,
  patch: LiveSyncVerificationPatch,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<VerificationSyncEventDetail>(VERIFICATION_SYNC_EVENT, {
      detail: { rentalId, ...patch },
    }),
  );
}

/** Recompute role-relative fields after applying a peer broadcast patch. */
export function mergeVerificationLivePatch<
  T extends {
    stage: VerificationStage;
    role: "buyer" | "seller";
    buyerConfirmed: boolean;
    sellerConfirmed: boolean;
    youConfirmed: boolean;
    bothConfirmed: boolean;
    isVerified: boolean;
    rentalStatus: string;
    canConfirm: boolean;
    canVerify: boolean;
  },
>(current: T, patch: LiveSyncVerificationPatch): T {
  const buyerConfirmed = patch.buyerConfirmed ?? current.buyerConfirmed;
  const sellerConfirmed = patch.sellerConfirmed ?? current.sellerConfirmed;
  const youConfirmed =
    current.role === "buyer" ? buyerConfirmed : sellerConfirmed;
  const bothConfirmed =
    patch.bothConfirmed ?? (buyerConfirmed && sellerConfirmed);
  const isVerified = patch.isVerified ?? current.isVerified;
  const rentalStatus = patch.rentalStatus ?? current.rentalStatus;
  const canVerify = patch.canVerify ?? current.canVerify;

  const canConfirm =
    isVerified &&
    !bothConfirmed &&
    !youConfirmed &&
    (current.stage === "HANDOVER"
      ? rentalStatus === "HANDOVER_PENDING"
      : rentalStatus === "RETURN_PENDING");

  return {
    ...current,
    buyerConfirmed,
    sellerConfirmed,
    youConfirmed,
    bothConfirmed,
    isVerified,
    rentalStatus,
    canVerify,
    canConfirm,
    ...(patch.verifiedMethod !== undefined
      ? { verifiedMethod: patch.verifiedMethod }
      : {}),
    ...(bothConfirmed
      ? { confirmationCompletedAt: new Date().toISOString() }
      : {}),
    ...(isVerified && patch.isVerified
      ? { qrPayload: null, pin: null, canRegenerate: false }
      : {}),
  };
}
