"use server";

import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Architecture-ready anonymous guest session.
 * Does NOT create a Profile row (guests have no profiles — Phase 1A locked).
 * Enable Anonymous Sign-Ins in Supabase Auth settings before using in production.
 */
export async function signInAsGuestAction(): Promise<
  AuthActionResult<{ userId: string; isAnonymous: true }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  if (!data.user) {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Guest session could not be created.",
      },
    };
  }

  return {
    ok: true,
    data: {
      userId: data.user.id,
      isAnonymous: true,
    },
  };
}
