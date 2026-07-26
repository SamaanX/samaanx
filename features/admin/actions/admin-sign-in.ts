"use server";

import { isAdminRole } from "@/features/admin/services/permissions";
import { signInSchema } from "@/features/auth/schemas/auth";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import {
  ensureProfileForUser,
  getProfileById,
} from "@/features/auth/services/profile-sync";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { signOutServer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function adminSignInAction(
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
        message: "Invalid admin credentials.",
      },
    };
  }

  await ensureProfileForUser(data.user);
  const profile = await getProfileById(data.user.id);

  if (!profile || !isAdminRole(profile.role)) {
    await signOutServer();
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "This account does not have admin access.",
      },
    };
  }

  if (profile.status === "SUSPENDED" || profile.status === "DELETED") {
    await signOutServer();
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "This admin account is not active.",
      },
    };
  }

  return {
    ok: true,
    data: {
      userId: data.user.id,
      email: data.user.email ?? email,
    },
  };
}
