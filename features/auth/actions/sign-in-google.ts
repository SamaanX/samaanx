"use server";

import { getPublicEnv } from "@/config/env";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts Google OAuth. UI should redirect the browser to `url`.
 * Requires Google provider enabled in Supabase Auth settings.
 */
export async function signInWithGoogleAction(): Promise<
  AuthActionResult<{ url: string }>
> {
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  if (!data.url) {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Google sign-in is not available right now.",
      },
    };
  }

  return { ok: true, data: { url: data.url } };
}
