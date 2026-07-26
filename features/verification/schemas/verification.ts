import { z } from "zod";

export const verificationStageSchema = z.enum(["HANDOVER", "RETURN"]);

export const generateVerificationSchema = z.object({
  rentalId: z.string().uuid(),
  stage: verificationStageSchema,
});

export const regenerateVerificationSchema = generateVerificationSchema;

export const verifyQrSchema = z.object({
  rentalId: z.string().uuid(),
  stage: verificationStageSchema,
  qrPayload: z.string().min(10).max(500),
});

export const verifyPinSchema = z.object({
  rentalId: z.string().uuid(),
  stage: verificationStageSchema,
  pin: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const confirmStageSchema = z.object({
  rentalId: z.string().uuid(),
  stage: verificationStageSchema,
});

export const requestReturnSchema = z.object({
  rentalId: z.string().uuid(),
});

export const getVerificationStatusSchema = z.object({
  rentalId: z.string().uuid(),
  stage: verificationStageSchema,
});
