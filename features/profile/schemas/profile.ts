import { z } from "zod";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB (bucket limit)
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

export const BIO_MAX_LENGTH = 500;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;
export const CITY_MAX = 80;
export const AREA_MAX = 120;
export const PHONE_MAX = 20;

export const updateProfileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(
      DISPLAY_NAME_MIN,
      `Name must be at least ${DISPLAY_NAME_MIN} characters`,
    )
    .max(DISPLAY_NAME_MAX, "Name is too long"),
  phone: z
    .string()
    .trim()
    .max(PHONE_MAX, "Phone number is too long")
    .refine(
      (value) => value === "" || /^\+?[0-9\s()-]{7,20}$/.test(value),
      "Enter a valid phone number",
    ),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, `Bio must be ${BIO_MAX_LENGTH} characters or less`),
  city: z.string().trim().max(CITY_MAX, "City is too long"),
  area: z.string().trim().max(AREA_MAX, "Area is too long"),
  preferredMode: z.enum(["BUYER", "SELLER"]),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;

export type UpdateProfileInput = {
  displayName: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  area: string | null;
  preferredMode: "BUYER" | "SELLER";
};

export function toUpdateProfileInput(
  values: UpdateProfileFormValues,
): UpdateProfileInput {
  return {
    displayName: values.displayName,
    phone: values.phone.length === 0 ? null : values.phone.replace(/\s+/g, " "),
    bio: values.bio.length === 0 ? null : values.bio,
    city: values.city.length === 0 ? null : values.city,
    area: values.area.length === 0 ? null : values.area,
    preferredMode: values.preferredMode,
  };
}

export function isAllowedAvatarMime(type: string): type is AvatarMimeType {
  return (AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}
