"use server";

import {
  type ProfileActionResult,
  type ProfileViewModel,
  toProfileViewModel,
} from "@/features/profile/types/profile";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { withPerf } from "@/lib/perf";

type PreferredMode = "BUYER" | "SELLER";

/**
 * Persist preferredMode only.
 * Chrome/home switch via PreferredModeProvider — no layout revalidate.
 */
export async function savePreferredMode(
  preferredMode: PreferredMode,
): Promise<ProfileActionResult<ProfileViewModel>> {
  return withPerf("action.savePreferredMode", async () => {
    try {
      const { profile } = await requireUser();

      if (profile.preferredMode === preferredMode) {
        return { ok: true, data: toProfileViewModel(profile) };
      }

      const updated = await prisma.profile.update({
        where: { id: profile.id },
        data: { preferredMode },
      });

      return { ok: true, data: toProfileViewModel(updated) };
    } catch (error) {
      logger.error("savePreferredMode failed", {
        message: error instanceof Error ? error.message : "unknown_error",
      });
      return {
        ok: false,
        error: {
          code: "INTERNAL",
          message: "Could not update mode. Please try again.",
        },
      };
    }
  });
}
