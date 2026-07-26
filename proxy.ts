import { type NextRequest, NextResponse } from "next/server";

import {
  isAuthCallbackPath,
  isAuthPage,
  isProtectedPath,
} from "@/lib/auth/routes";
import { copyCookies, updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const started = performance.now();
  const { response, user } = await updateSession(request);
  if (process.env.NODE_ENV === "development") {
    console.warn(
      JSON.stringify({
        level: "debug",
        message: "perf",
        label: "proxy.updateSession",
        ms: Math.round(performance.now() - started),
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      }),
    );
  }
  const { pathname, search } = request.nextUrl;

  if (isAuthCallbackPath(pathname)) {
    return response;
  }

  const isAnonymous = Boolean(user?.is_anonymous);
  const isFullUser = Boolean(user && !isAnonymous);

  if (isProtectedPath(pathname) && !isFullUser) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  // Allow recovery sessions to reach /reset-password after email link.
  if (
    isAuthPage(pathname) &&
    isFullUser &&
    pathname !== "/reset-password" &&
    !pathname.startsWith("/reset-password/")
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return copyCookies(response, NextResponse.redirect(homeUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
