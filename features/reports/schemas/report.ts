import { z } from "zod";

/** UI may send REVIEW; server maps it onto USER + review metadata. */
export const createReportSchema = z.object({
  targetType: z.enum(["LISTING", "USER", "RENTAL", "MESSAGE", "REVIEW"]),
  targetId: z.string().uuid(),
  rentalId: z.string().uuid().optional().nullable(),
  type: z.enum(["ABUSE", "FRAUD", "ITEM_ISSUE", "DISPUTE", "OTHER"]),
  reason: z
    .string()
    .trim()
    .min(8, "Please provide a short reason (at least 8 characters).")
    .max(200),
  details: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
