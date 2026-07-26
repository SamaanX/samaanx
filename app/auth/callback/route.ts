import { NextResponse } from "next/server";

import { ensureProfileForUser } from "@/features/auth/services/profile-sync";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link callback — exchanges code for session and syncs Profile.
 * Not a UI page; required backend foundation for Google OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.error("Auth callback failed", { message: error.message });
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  if (data.user && !data.user.is_anonymous) {
    try {
      await ensureProfileForUser(data.user);
    } catch (profileError) {
      logger.error("Profile sync failed after auth callback", {
        message:
          profileError instanceof Error
            ? profileError.message
            : "unknown_error",
      });
    }
  }

  const redirectPath = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
