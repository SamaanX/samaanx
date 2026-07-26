"use server";

import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  isAllowedAvatarMime,
} from "@/features/profile/schemas/profile";
import {
  buildAvatarObjectPath,
  extensionForMime,
  extractOwnAvatarObjectPath,
  getAvatarPublicUrl,
} from "@/features/profile/services/avatar-storage";
import { toProfileActionError } from "@/features/profile/services/profile-errors";
import {
  type ProfileActionResult,
  type ProfileViewModel,
  toProfileViewModel,
} from "@/features/profile/types/profile";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ProfileActionResult<ProfileViewModel>> {
  try {
    const { user, profile } = await requireUser();
    const file = formData.get("avatar");

    if (!(file instanceof File) || file.size === 0) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Choose an image to upload.",
        },
      };
    }

    if (!isAllowedAvatarMime(file.type)) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Use a JPEG, PNG, WebP, or AVIF image.",
        },
      };
    }

    if (file.size > AVATAR_MAX_BYTES) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Image must be 2 MB or smaller.",
        },
      };
    }

    const ext = extensionForMime(file.type);
    const objectPath = buildAvatarObjectPath(
      user.id,
      `avatar-${Date.now()}.${ext}`,
    );

    const supabase = await createClient();
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      logger.error("Avatar upload failed", { message: uploadError.message });
      return {
        ok: false,
        error: {
          code: "INTERNAL",
          message: "Could not upload your photo. Please try again.",
        },
      };
    }

    const previousPath = extractOwnAvatarObjectPath(profile.avatarUrl, user.id);
    if (previousPath && previousPath !== objectPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
    }

    const avatarUrl = getAvatarPublicUrl(objectPath);

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl },
    });

    return { ok: true, data: toProfileViewModel(updated) };
  } catch (error) {
    logger.error("uploadAvatarAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toProfileActionError(error) };
  }
}
