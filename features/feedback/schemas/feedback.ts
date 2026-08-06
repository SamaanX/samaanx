import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "BUG",
  "FEATURE",
  "UX",
  "GENERAL",
  "OTHER",
] as const;

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES, {
    required_error: "Pick a category.",
  }),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters.")
    .max(120, "Subject must be 120 characters or less."),
  message: z
    .string()
    .trim()
    .min(10, "Please share a bit more detail (at least 10 characters).")
    .max(2000, "Message must be 2000 characters or less."),
  pageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const updateFeedbackStatusSchema = z.object({
  feedbackId: z.string().uuid(),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
  adminNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  reason: z.string().trim().min(3, "Reason is required."),
});
