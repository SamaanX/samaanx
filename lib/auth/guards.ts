import type { Profile, UserRole } from "@prisma/client";
import { cache } from "react";

import { isAdminRole } from "@/features/admin/services/permissions";
import {
  ensureProfileForUser,
  getProfileById,
} from "@/features/auth/services/profile-sync";
import type { RequireUserResult } from "@/features/auth/types/auth";
import {
  getCurrentUser,
  isAnonymousUser,
  isFullUser,
} from "@/lib/auth/session";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  return withPerf("auth.getCurrentProfile", async () => {
    const user = await getCurrentUser();

    if (!user || isAnonymousUser(user)) {
      return null;
    }

    const existing = await getProfileById(user.id);
    if (existing) {
      return existing;
    }

    return ensureProfileForUser(user);
  });
});

/**
 * Requires a full (non-anonymous) authenticated user with a Profile row.
 * Reuses getCurrentProfile / getCurrentUser caches — no duplicate auth/DB work
 * when a layout already loaded the profile in the same request.
 */
export async function requireUser(): Promise<RequireUserResult> {
  const profile = await getCurrentProfile();
  const user = await getCurrentUser();

  if (!user || isAnonymousUser(user) || !profile) {
    throw new AppError("You must be signed in to continue.", {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  if (profile.status === "SUSPENDED" || profile.status === "DELETED") {
    throw new AppError("This account is not allowed to continue.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return { user, profile };
}

export async function requireAdmin(): Promise<RequireUserResult> {
  const result = await requireUser();

  if (!isAdminRole(result.profile.role)) {
    throw new AppError("Admin access required.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return result;
}

export async function requireSuperAdmin(): Promise<RequireUserResult> {
  const result = await requireUser();

  if (result.profile.role !== "SUPER_ADMIN") {
    throw new AppError("Super admin access required.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return result;
}

export function assertAdminPermission(
  role: UserRole,
  allowed: boolean,
  message = "You do not have permission for this action.",
): void {
  if (!allowed) {
    throw new AppError(message, { code: "FORBIDDEN", status: 403 });
  }
  if (!isAdminRole(role)) {
    throw new AppError("Admin access required.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }
}

/**
 * Ensures there is no full authenticated session (auth pages / guest-only flows).
 * Anonymous guest sessions are allowed.
 */
export async function requireGuest(): Promise<void> {
  const user = await getCurrentUser();

  if (isFullUser(user)) {
    throw new AppError("You are already signed in.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }
}
