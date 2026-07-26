"use server";

import { AVATAR_BUCKET } from "@/features/profile/schemas/profile";
import { extractOwnAvatarObjectPath } from "@/features/profile/services/avatar-storage";
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

export async function deleteAvatarAction(): Promise<
  ProfileActionResult<ProfileViewModel>
> {
  try {
    const { user, profile } = await requireUser();
    const objectPath = extractOwnAvatarObjectPath(profile.avatarUrl, user.id);

    if (objectPath) {
      const supabase = await createClient();
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([objectPath]);

      if (error) {
        logger.error("Avatar delete failed", { message: error.message });
        return {
          ok: false,
          error: {
            code: "INTERNAL",
            message: "Could not remove your photo. Please try again.",
          },
        };
      }
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl: null },
    });

    return { ok: true, data: toProfileViewModel(updated) };
  } catch (error) {
    logger.error("deleteAvatarAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toProfileActionError(error) };
  }
}
