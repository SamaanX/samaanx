"use server";

import type { FeedbackStatus, ListingModerationStatus } from "@prisma/client";

import { getAdminAuditLogsPage } from "@/features/admin/queries/audit-logs";
import { getAdminDisputesPage } from "@/features/admin/queries/disputes";
import { getAdminFeedbackPage } from "@/features/admin/queries/feedback";
import { getAdminListingsPage } from "@/features/admin/queries/listings";
import { getAdminReportsPage } from "@/features/admin/queries/reports";
import { getAdminUsersPage } from "@/features/admin/queries/users";
import { requireAdmin } from "@/lib/auth/guards";

export async function fetchAdminUsersPageAction(params: {
  page?: number;
  q?: string;
}) {
  await requireAdmin();
  return getAdminUsersPage(params);
}

export async function fetchAdminListingsPageAction(params: {
  page?: number;
  moderationStatus?: ListingModerationStatus;
}) {
  await requireAdmin();
  return getAdminListingsPage(params);
}

export async function fetchAdminReportsPageAction(params: { page?: number }) {
  await requireAdmin();
  return getAdminReportsPage(params);
}

export async function fetchAdminFeedbackPageAction(params: {
  page?: number;
  status?: FeedbackStatus;
  q?: string;
}) {
  await requireAdmin();
  return getAdminFeedbackPage(params);
}

export async function fetchAdminDisputesPageAction(params: { page?: number }) {
  await requireAdmin();
  return getAdminDisputesPage(params);
}

export async function fetchAdminActivityPageAction(params: { page?: number }) {
  await requireAdmin();
  return getAdminAuditLogsPage(params);
}
