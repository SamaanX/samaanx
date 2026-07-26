import { z } from "zod";

export const LISTING_IMAGES_BUCKET = "listing-images";
export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const LISTING_IMAGE_MIN = 1;
export const LISTING_IMAGE_MAX = 10;
export const LISTING_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const CITY_MAX = 80;
export const AREA_MAX = 120;

export type ListingImageMime = (typeof LISTING_IMAGE_MIME_TYPES)[number];

export function isAllowedListingImageMime(
  type: string,
): type is ListingImageMime {
  return (LISTING_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

const moneySchema = z.coerce
  .number({ invalid_type_error: "Enter a valid amount" })
  .positive("Amount must be greater than 0")
  .max(9_999_999.99, "Amount is too large");

const dateStringSchema = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const listingAvailabilitySchema = z
  .object({
    type: z.enum(["AVAILABLE", "BLOCKED"]),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    notes: z
      .string()
      .trim()
      .max(200, "Notes are too long")
      .nullable()
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }
  });

export const listingFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or less`),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(
        DESCRIPTION_MAX,
        `Description must be ${DESCRIPTION_MAX} characters or less`,
      ),
    categoryId: z.string().uuid("Choose a category"),
    rentPriceAmount: moneySchema,
    rentPriceUnit: z.enum(["DAY", "WEEK", "MONTH"]),
    depositType: z.enum(["NONE", "FIXED", "PERCENTAGE"]),
    depositAmount: z.coerce.number().nonnegative().max(9_999_999.99).optional(),
    depositPercent: z.coerce.number().min(0).max(100).optional(),
    city: z
      .string()
      .trim()
      .min(2, "City is required")
      .max(CITY_MAX, "City is too long"),
    area: z
      .string()
      .trim()
      .min(2, "Area is required")
      .max(AREA_MAX, "Area is too long"),
    countryCode: z
      .string()
      .trim()
      .length(2, "Country code must be 2 letters")
      .transform((value) => value.toUpperCase()),
    lat: z.coerce
      .number({ invalid_type_error: "Latitude is required" })
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    lng: z.coerce
      .number({ invalid_type_error: "Longitude is required" })
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    showExactPickup: z.boolean(),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "SOLD_OUT", "ARCHIVED"]),
    availability: z
      .array(listingAvailabilitySchema)
      .min(1, "Add at least one availability window"),
  })
  .superRefine((value, ctx) => {
    if (value.depositType === "FIXED") {
      if (
        value.depositAmount === undefined ||
        Number.isNaN(value.depositAmount)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit amount is required for fixed deposits",
          path: ["depositAmount"],
        });
      } else if (value.depositAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit amount must be greater than 0",
          path: ["depositAmount"],
        });
      }
    }

    if (value.depositType === "PERCENTAGE") {
      if (
        value.depositPercent === undefined ||
        Number.isNaN(value.depositPercent)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percent is required",
          path: ["depositPercent"],
        });
      } else if (value.depositPercent <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percent must be greater than 0",
          path: ["depositPercent"],
        });
      }
    }

    const hasAvailable = value.availability.some(
      (row) => row.type === "AVAILABLE",
    );
    if (!hasAvailable) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Include at least one AVAILABLE window",
        path: ["availability"],
      });
    }
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export const listingImageMetaSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  sortOrder: z
    .number()
    .int()
    .min(0)
    .max(LISTING_IMAGE_MAX - 1),
  byteSize: z.number().int().positive().max(LISTING_IMAGE_MAX_BYTES),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});

export type ListingImageMeta = z.infer<typeof listingImageMetaSchema>;
