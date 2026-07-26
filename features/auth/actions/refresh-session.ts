"use server";

import { toAuthActionError } from "@/features/auth/services/auth-errors";
import { ensureProfileForUser } from "@/features/auth/services/profile-sync";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { isAnonymousUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function refreshSessionAction(): Promise<
  AuthActionResult<{ userId: string | null; isAnonymous: boolean }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  const user = data.user;

  if (user && !isAnonymousUser(user)) {
    await ensureProfileForUser(user);
  }

  return {
    ok: true,
    data: {
      userId: user?.id ?? null,
      isAnonymous: isAnonymousUser(user),
    },
  };
}
