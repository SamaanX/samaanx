"use server";

import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { resolveAuthRedirectOrigin } from "@/lib/auth/app-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts Google OAuth. UI should redirect the browser to `url`.
 * Requires Google provider enabled in Supabase Auth settings.
 */
export async function signInWithGoogleAction(
  clientOrigin?: string,
): Promise<AuthActionResult<{ url: string }>> {
  const appOrigin = resolveAuthRedirectOrigin(clientOrigin);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appOrigin}/auth/callback`,
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
