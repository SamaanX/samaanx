import type { VerificationStage } from "@prisma/client";

export type VerificationActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "INTERNAL";
};

export type VerificationActionResult<T> =
  { ok: true; data: T } | { ok: false; error: VerificationActionError };

export type VerificationStatusView = {
  rentalId: string;
  listingTitle: string;
  listingSlug: string;
  stage: VerificationStage;
  rentalStatus: string;
  role: "buyer" | "seller";
  /** Counterparty profile id — for live-sync broadcast after mutations. */
  peerUserId: string;
  verificationId: string | null;
  qrPayload: string | null;
  /** Plaintext PIN — only for current unverified codes; derived, never from DB. */
  pin: string | null;
  expiresAt: string | null;
  generatedAt: string | null;
  isExpired: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  maxAttempts: number;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedMethod: "QR" | "PIN" | null;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  youConfirmed: boolean;
  bothConfirmed: boolean;
  confirmationCompletedAt: string | null;
  canRegenerate: boolean;
  canVerify: boolean;
  canConfirm: boolean;
};

export type GenerateVerificationResult = {
  rentalId: string;
  stage: VerificationStage;
  verificationId: string;
  qrPayload: string;
  pin: string;
  expiresAt: string;
};
