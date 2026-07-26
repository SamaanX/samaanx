"use server";

import {
  toUpdateProfileInput,
  updateProfileFormSchema,
} from "@/features/profile/schemas/profile";
import { toProfileActionError } from "@/features/profile/services/profile-errors";
import {
  type ProfileActionResult,
  type ProfileViewModel,
  toProfileViewModel,
} from "@/features/profile/types/profile";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function updateProfileAction(
  input: unknown,
): Promise<ProfileActionResult<ProfileViewModel>> {
  try {
    const { profile } = await requireUser();
    const parsed = updateProfileFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid profile data.",
        },
      };
    }

    const data = toUpdateProfileInput(parsed.data);

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        displayName: data.displayName,
        phone: data.phone,
        bio: data.bio,
        city: data.city,
        area: data.area,
        preferredMode: data.preferredMode,
      },
    });

    return { ok: true, data: toProfileViewModel(updated) };
  } catch (error) {
    logger.error("updateProfileAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toProfileActionError(error) };
  }
}
