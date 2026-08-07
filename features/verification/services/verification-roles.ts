import type { VerificationStage } from "@prisma/client";

export type RentalPartyRole = "buyer" | "seller";

/** Party that shows QR/PIN at the physical meetup. */
export function canDisplayVerificationCodes(
  stage: VerificationStage,
  role: RentalPartyRole,
): boolean {
  return stage === "HANDOVER" ? role === "seller" : role === "buyer";
}

/** Party that scans QR or enters PIN from the other device. */
export function canVerifyVerification(
  stage: VerificationStage,
  role: RentalPartyRole,
): boolean {
  return stage === "HANDOVER" ? role === "buyer" : role === "seller";
}

export function displayPartyLabel(stage: VerificationStage): string {
  return stage === "HANDOVER" ? "owner" : "renter";
}

export function verifyPartyLabel(stage: VerificationStage): string {
  return stage === "HANDOVER" ? "renter" : "owner";
}
