"use server";

import { forgotPasswordSchema } from "@/features/auth/schemas/auth";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { resolveAuthRedirectOrigin } from "@/lib/auth/app-origin";
import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(
  input: unknown,
  clientOrigin?: string,
): Promise<AuthActionResult<{ success: true }>> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Invalid email.",
      },
    };
  }

  const appOrigin = resolveAuthRedirectOrigin(clientOrigin);
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${appOrigin}/reset-password`,
    },
  );

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  // Always return success to avoid email enumeration.
  return { ok: true, data: { success: true } };
}
