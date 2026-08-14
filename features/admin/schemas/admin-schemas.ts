import { z } from "zod";

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Reason must be at least 3 characters.")
  .max(500);

export const adminUserActionSchema = z.object({
  userId: z.string().uuid(),
  reason: reasonSchema,
});

export const adminRoleChangeSchema = adminUserActionSchema.extend({
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
});

export const adminListingModerationSchema = z.object({
  listingId: z.string().uuid(),
  reason: reasonSchema,
});

export const adminReportActionSchema = z.object({
  reportId: z.string().uuid(),
  reason: reasonSchema,
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export const adminDisputeUpdateSchema = z.object({
  disputeId: z.string().uuid(),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]),
  adminNotes: z.string().trim().max(4000).optional(),
  resolution: z.string().trim().max(2000).optional(),
  reason: reasonSchema,
});

export const adminSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maxActiveListingsPerSeller: z.number().int().min(1).max(500),
  maxRentalDays: z.number().int().min(1).max(365),
  defaultDepositType: z.enum(["NONE", "FIXED", "PERCENTAGE"]),
  supportEmail: z.string().email(),
  platformAnnouncement: z.string().max(500).nullable(),
});

const adminAnnouncementBaseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  target: z.enum(["ALL", "BUYERS", "SELLERS", "ADMINS", "USER"]),
  targetUserId: z.string().uuid().nullable().optional(),
  dismissible: z.boolean(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

function requireUserTarget<
  T extends { target: string; targetUserId?: string | null },
>(data: T, ctx: z.RefinementCtx) {
  if (data.target === "USER" && !data.targetUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a user for a user-targeted announcement.",
      path: ["targetUserId"],
    });
  }
}

export const adminAnnouncementSchema =
  adminAnnouncementBaseSchema.superRefine(requireUserTarget);

export const adminAnnouncementUpdateSchema = adminAnnouncementBaseSchema
  .extend({
    id: z.string().uuid(),
    notifyUsers: z.boolean().default(true),
  })
  .superRefine(requireUserTarget);

export const adminSearchSchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
  q: z.string().trim().optional(),
});
