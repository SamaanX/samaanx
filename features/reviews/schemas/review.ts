import { z } from "zod";

export const submitReviewSchema = z.object({
  rentalId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(2000, "Review must be under 2000 characters.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
