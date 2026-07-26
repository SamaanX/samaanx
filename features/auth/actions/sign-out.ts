"use server";

import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<
  AuthActionResult<{ success: true }>
> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  return { ok: true, data: { success: true } };
}
