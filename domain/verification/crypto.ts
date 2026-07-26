import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const VERIFICATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export type VerificationStageName = "HANDOVER" | "RETURN";

export function requireHmacSecret(secret: string | undefined): string {
  if (
    !secret ||
    secret.length < 16 ||
    secret === "replace-with-long-random-string"
  ) {
    throw new Error(
      "VERIFICATION_HMAC_SECRET must be set to a long random string.",
    );
  }
  return secret;
}

export function newVerificationId(): string {
  return randomUUID();
}

/** 6-digit PIN derived server-side — never persisted as plaintext. */
export function derivePin(secret: string, verificationId: string): string {
  const mac = createHmac("sha256", secret)
    .update(`PIN|${verificationId}`)
    .digest("hex");
  const num = BigInt(`0x${mac.slice(0, 12)}`) % BigInt(1_000_000);
  return num.toString().padStart(6, "0");
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const candidate = scryptSync(pin, salt, 32).toString("hex");
  try {
    return timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(candidate, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Opaque QR payload — uses verification UUID, not rental UUID.
 * Format: RENTPE|{verificationId}|{expUnix}|{hmac}
 */
export function buildQrPayload(params: {
  secret: string;
  verificationId: string;
  expiresAt: Date;
  stage: VerificationStageName;
}): { qrPayload: string; qrHash: string } {
  const expUnix = Math.floor(params.expiresAt.getTime() / 1000);
  const body = `${params.verificationId}|${expUnix}|${params.stage}`;
  const hmac = createHmac("sha256", params.secret)
    .update(`QR|${body}`)
    .digest("hex")
    .slice(0, 32);
  const qrPayload = `RENTPE|${params.verificationId}|${expUnix}|${hmac}`;
  const qrHash = createHmac("sha256", params.secret)
    .update(`QRHASH|${qrPayload}`)
    .digest("hex");
  return { qrPayload, qrHash };
}

export type ParsedQrPayload = {
  verificationId: string;
  expUnix: number;
  hmac: string;
};

export function parseQrPayload(raw: string): ParsedQrPayload | null {
  const parts = raw.trim().split("|");
  if (parts.length !== 4 || parts[0] !== "RENTPE") {
    return null;
  }
  const [, verificationId, expUnixRaw, hmac] = parts;
  if (!verificationId || !expUnixRaw || !hmac) {
    return null;
  }
  const expUnix = Number(expUnixRaw);
  if (!Number.isFinite(expUnix)) {
    return null;
  }
  return { verificationId, expUnix, hmac };
}

export function verifyQrPayload(params: {
  secret: string;
  qrPayload: string;
  expectedVerificationId: string;
  stage: VerificationStageName;
  now?: Date;
}): boolean {
  const parsed = parseQrPayload(params.qrPayload);
  if (!parsed) {
    return false;
  }
  if (parsed.verificationId !== params.expectedVerificationId) {
    return false;
  }
  const now = params.now ?? new Date();
  if (parsed.expUnix * 1000 < now.getTime()) {
    return false;
  }
  const body = `${parsed.verificationId}|${parsed.expUnix}|${params.stage}`;
  const expectedHmac = createHmac("sha256", params.secret)
    .update(`QR|${body}`)
    .digest("hex")
    .slice(0, 32);
  try {
    return timingSafeEqual(
      Buffer.from(parsed.hmac, "utf8"),
      Buffer.from(expectedHmac, "utf8"),
    );
  } catch {
    return false;
  }
}

export function computeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + VERIFICATION_EXPIRY_MS);
}

export function computeLockUntil(from: Date = new Date()): Date {
  return new Date(from.getTime() + LOCKOUT_MS);
}
