"use server";

import { resetPasswordSchema } from "@/features/auth/schemas/auth";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Requires an active recovery/authenticated session (from reset email link).
 */
export async function resetPasswordAction(
  input: unknown,
): Promise<AuthActionResult<{ success: true }>> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Invalid password data.",
      },
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Reset link is invalid or expired. Request a new one.",
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  return { ok: true, data: { success: true } };
}
