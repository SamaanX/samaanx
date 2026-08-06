import type { FeedbackStatus } from "@prisma/client";

import { AdminFeedbackClient } from "@/features/admin/components/admin-feedback-client";
import { getAdminFeedbackPage } from "@/features/admin/queries/feedback";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status as FeedbackStatus | undefined;
  const allowed: FeedbackStatus[] = [
    "OPEN",
    "IN_REVIEW",
    "RESOLVED",
    "DISMISSED",
  ];
  const data = await getAdminFeedbackPage({
    page: Number(params.page ?? "1"),
    status: status && allowed.includes(status) ? status : undefined,
  });

  return (
    <AdminFeedbackClient initial={data} statusFilter={params.status ?? ""} />
  );
}
