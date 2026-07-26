/**
 * Route classification for auth proxy.
 * Paths are pathname prefixes / exact matches (no locale).
 */

export const AUTH_PAGE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

/** Routes that require a full (non-anonymous) authenticated user + profile. */
export const PROTECTED_PATH_PREFIXES = [
  "/profile",
  "/wishlist",
  "/rentals",
  "/chat",
  "/seller",
  "/admin",
  "/notifications",
] as const;

export const ADMIN_PATH_PREFIXES = ["/admin"] as const;

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthCallbackPath(pathname: string): boolean {
  return (
    pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")
  );
}
