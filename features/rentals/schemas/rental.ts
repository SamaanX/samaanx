import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const createRentalRequestSchema = z
  .object({
    listingId: z.string().uuid("Invalid listing"),
    startDate: dateOnly,
    endDate: dateOnly,
    messageToSeller: z
      .string()
      .trim()
      .max(500, "Message must be 500 characters or less")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date cannot be before start date",
        path: ["endDate"],
      });
    }
  });

export const rejectRentalRequestSchema = z.object({
  rentalId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Please provide a short reason")
    .max(500, "Reason must be 500 characters or less"),
});

export const cancelRentalRequestSchema = z.object({
  rentalId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must be 500 characters or less")
    .optional()
    .or(z.literal("")),
});

export type CreateRentalRequestInput = z.infer<
  typeof createRentalRequestSchema
>;
export type RejectRentalRequestInput = z.infer<
  typeof rejectRentalRequestSchema
>;
export type CancelRentalRequestInput = z.infer<
  typeof cancelRentalRequestSchema
>;
