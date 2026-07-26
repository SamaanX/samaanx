"use server";

import { signInSchema } from "@/features/auth/schemas/auth";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import { ensureProfileForUser } from "@/features/auth/services/profile-sync";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(
  input: unknown,
): Promise<AuthActionResult<{ userId: string; email: string }>> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Invalid sign-in data.",
      },
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  if (!data.user || !data.session) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Email or password is incorrect.",
      },
    };
  }

  await ensureProfileForUser(data.user);

  return {
    ok: true,
    data: {
      userId: data.user.id,
      email: data.user.email ?? email,
    },
  };
}
