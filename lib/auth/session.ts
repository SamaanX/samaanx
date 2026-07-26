import type { Session, User } from "@supabase/supabase-js";
import { cache } from "react";

import { withPerf } from "@/lib/perf";
import { recordAuthCall } from "@/lib/perf/request-metrics";
import { createClient } from "@/lib/supabase/server";

export function isAnonymousUser(user: User | null | undefined): boolean {
  return Boolean(user?.is_anonymous);
}

export function isFullUser(user: User | null | undefined): boolean {
  return Boolean(user && !user.is_anonymous);
}

/** One Supabase SSR client per React request (dedupes cookie reads). */
export const getSupabaseServerClient = cache(async () => createClient());

export const getSession = cache(async (): Promise<Session | null> => {
  return withPerf("auth.getSession", async () => {
    recordAuthCall("getSession");
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return null;
    }

    return data.session;
  });
});

/**
 * Deduped per request via React cache().
 * Middleware still calls getUser separately (Edge) — this covers the RSC tree.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  return withPerf("auth.getUser", async () => {
    recordAuthCall("getUser");
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  });
});

/**
 * Refreshes the session via Supabase SSR cookie client.
 * Middleware also refreshes on each matched request.
 */
export async function refreshSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return null;
  }

  return data.session;
}

export async function signOutServer(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
