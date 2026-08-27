/** Headers set by Supabase session middleware after a validated getUser(). */
export const MIDDLEWARE_AUTH_VALIDATED_HEADER = "x-middleware-auth-validated";
export const MIDDLEWARE_USER_ID_HEADER = "x-middleware-user-id";

export function isMiddlewareAuthValidated(headers: Headers): boolean {
  return headers.get(MIDDLEWARE_AUTH_VALIDATED_HEADER) === "1";
}

export function getMiddlewareUserId(headers: Headers): string | null {
  return headers.get(MIDDLEWARE_USER_ID_HEADER);
}
