"use server";

import { getCriticalActivitySnapshot } from "@/features/activity/queries/critical-activity";
import type { ActivitySnapshot } from "@/features/activity/types/activity";
import { getCurrentProfile } from "@/lib/auth/guards";
import type { AppUiMode } from "@/lib/ui/app-mode";

export async function getCriticalActivitySnapshotAction(
  mode: AppUiMode,
): Promise<ActivitySnapshot | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return getCriticalActivitySnapshot(profile.id, mode);
}
