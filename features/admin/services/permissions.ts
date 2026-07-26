import type { UserRole } from "@prisma/client";

export const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export type AdminPermission =
  | "dashboard.view"
  | "users.view"
  | "users.manage"
  | "users.promote_admin"
  | "sellers.manage"
  | "listings.moderate"
  | "reports.manage"
  | "disputes.manage"
  | "analytics.view"
  | "search.global"
  | "audit.view"
  | "settings.manage"
  | "announcements.manage";

const SUPER_ADMIN_PERMISSIONS: AdminPermission[] = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "users.promote_admin",
  "sellers.manage",
  "listings.moderate",
  "reports.manage",
  "disputes.manage",
  "analytics.view",
  "search.global",
  "audit.view",
  "settings.manage",
  "announcements.manage",
];

const ADMIN_PERMISSIONS: AdminPermission[] = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "sellers.manage",
  "listings.moderate",
  "reports.manage",
  "disputes.manage",
  "analytics.view",
  "search.global",
  "audit.view",
  "announcements.manage",
];

export function getPermissionsForRole(role: UserRole): AdminPermission[] {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_PERMISSIONS;
  if (role === "ADMIN") return ADMIN_PERMISSIONS;
  return [];
}

export function hasAdminPermission(
  role: UserRole,
  permission: AdminPermission,
): boolean {
  return getPermissionsForRole(role).includes(permission);
}
