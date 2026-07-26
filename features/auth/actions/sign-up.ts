"use server";

import { signUpSchema } from "@/features/auth/schemas/auth";
import { toAuthActionError } from "@/features/auth/services/auth-errors";
import { ensureProfileForUser } from "@/features/auth/services/profile-sync";
import type { AuthActionResult } from "@/features/auth/types/auth";
import { sendWelcomeEmailForUser } from "@/features/jobs/processor";
import { createClient } from "@/lib/supabase/server";

export type SignUpResult = {
  userId: string;
  email: string;
  /** False when Supabase requires email confirmation before a session exists. */
  sessionEstablished: boolean;
};

export async function signUpAction(
  input: unknown,
): Promise<AuthActionResult<SignUpResult>> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: parsed.error.issues[0]?.message ?? "Invalid sign-up data.",
      },
    };
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName ?? email.split("@")[0],
      },
    },
  });

  if (error) {
    return { ok: false, error: toAuthActionError(error) };
  }

  if (!data.user) {
    return {
      ok: false,
      error: {
        code: "INTERNAL",
        message: "Sign-up failed. Please try again.",
      },
    };
  }

  // Supabase may return a user without a session when confirm-email is enabled.
  // Establish a session when the project allows immediate sign-in.
  let session = data.session;

  if (!session) {
    const signedIn = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signedIn.data.session) {
      session = signedIn.data.session;
    } else if (signedIn.error) {
      const message = signedIn.error.message.toLowerCase();
      const needsConfirm =
        message.includes("email not confirmed") || message.includes("confirm");

      if (needsConfirm) {
        return {
          ok: true,
          data: {
            userId: data.user.id,
            email: data.user.email ?? email,
            sessionEstablished: false,
          },
        };
      }

      return { ok: false, error: toAuthActionError(signedIn.error) };
    }
  }

  if (session && !data.user.is_anonymous) {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser && !currentUser.is_anonymous) {
      await ensureProfileForUser(currentUser, { displayName });
      void sendWelcomeEmailForUser({
        userId: currentUser.id,
        email: currentUser.email ?? email,
        displayName: displayName ?? currentUser.email?.split("@")[0] ?? "there",
      });
    } else {
      await ensureProfileForUser(data.user, { displayName });
      void sendWelcomeEmailForUser({
        userId: data.user.id,
        email: data.user.email ?? email,
        displayName: displayName ?? email.split("@")[0] ?? "there",
      });
    }
  }

  return {
    ok: true,
    data: {
      userId: data.user.id,
      email: data.user.email ?? email,
      sessionEstablished: Boolean(session),
    },
  };
}
