import type { Profile, UserRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";

export type AuthUser = User;

export type AuthSessionSummary = {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
};

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "email"
  | "displayName"
  | "avatarUrl"
  | "role"
  | "preferredMode"
  | "status"
  | "countryCode"
  | "verificationBadge"
>;

export type AuthActionError = {
  message: string;
  code:
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "NOT_FOUND"
    | "INTERNAL";
};

export type AuthActionResult<T> =
  { ok: true; data: T } | { ok: false; error: AuthActionError };

export type RequireUserResult = {
  user: AuthUser;
  profile: Profile;
};

export type AdminCheck = {
  role: UserRole;
};
