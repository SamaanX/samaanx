import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/config/env";
import {
  isAuthCallbackPath,
  isAuthPage,
  isProtectedPath,
} from "@/lib/auth/routes";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
};

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-"),
    );
}

/**
 * Refresh session when needed.
 * Guest marketplace traffic with no auth cookie skips Auth RTT (Pakistan latency win).
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdateResult> {
  const pathname = request.nextUrl.pathname;
  const needsAuthCheck =
    isProtectedPath(pathname) ||
    isAuthPage(pathname) ||
    isAuthCallbackPath(pathname) ||
    hasSupabaseAuthCookie(request);

  if (!needsAuthCheck) {
    return {
      response: NextResponse.next({ request }),
      user: null,
    };
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let user: User | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return { response: supabaseResponse, user: null };
  }

  return { response: supabaseResponse, user };
}

/**
 * Copies Supabase cookies from a session response onto a redirect response.
 */
export function copyCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}
