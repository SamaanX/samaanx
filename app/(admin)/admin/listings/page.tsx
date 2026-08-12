import type { ListingModerationStatus } from "@prisma/client";

import { AdminListingsClient } from "@/features/admin/components/admin-listings-client";
import { getAdminListingsPage } from "@/features/admin/queries/listings";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; moderation?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const moderation = params.moderation as ListingModerationStatus | undefined;

  const data = await getAdminListingsPage({
    page,
    moderationStatus: moderation,
  });

  return (
    <AdminListingsClient
      initial={data}
      filter={params.moderation ?? "all"}
      initialPage={page}
    />
  );
}
