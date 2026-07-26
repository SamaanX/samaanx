import { getPublicEnv } from "@/config/env";
import { LISTING_IMAGES_BUCKET } from "@/features/listings/schemas/listing";

export function buildListingImagePath(
  userId: string,
  listingId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${listingId}/${safe}`;
}

export function getListingImagePublicUrl(objectPath: string): string {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${objectPath}`;
}

export function extensionForListingMime(mime: string): "jpg" | "png" | "webp" {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export function isOwnedListingImagePath(
  storagePath: string,
  userId: string,
): boolean {
  return storagePath.startsWith(`${userId}/`);
}
