import { getPublicEnv } from "@/config/env";
import { AVATAR_BUCKET } from "@/features/profile/schemas/profile";

/**
 * Builds a storage object path: `{userId}/{filename}`.
 * Matches Storage RLS folder ownership convention.
 */
export function buildAvatarObjectPath(
  userId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${safeName}`;
}

export function getAvatarPublicUrl(objectPath: string): string {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
}

/**
 * Extracts avatars/{userId}/... object path from a public URL, if owned by user.
 */
export function extractOwnAvatarObjectPath(
  avatarUrl: string | null | undefined,
  userId: string,
): string | null {
  if (!avatarUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = avatarUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }

  const objectPath = decodeURIComponent(avatarUrl.slice(index + marker.length));
  if (!objectPath.startsWith(`${userId}/`)) {
    return null;
  }

  return objectPath;
}

export function extensionForMime(
  mime: string,
): "jpg" | "png" | "webp" | "avif" {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}
