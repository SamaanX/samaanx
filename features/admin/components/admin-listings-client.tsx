"use client";

import type { ListingModerationStatus } from "@prisma/client";
import * as React from "react";
import { toast } from "sonner";

import {
  approveListingAction,
  hideListingAction,
  rejectListingAction,
  restoreListingAction,
} from "@/features/admin/actions/listing-actions";
import { fetchAdminListingsPageAction } from "@/features/admin/actions/page-queries";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import {
  useAdminListQuery,
  useInvalidateAdminList,
} from "@/features/admin/hooks/use-admin-list-query";
import type { AdminListingRow, Paginated } from "@/features/admin/types/admin";
import { queryKeys } from "@/lib/query-keys";

type AdminListingsClientProps = {
  initial: Paginated<AdminListingRow>;
  filter?: string;
  initialPage: number;
};

export function AdminListingsClient({
  initial,
  filter,
  initialPage,
}: AdminListingsClientProps) {
  const invalidate = useInvalidateAdminList();
  const [page, setPage] = React.useState(initialPage);
  const [moderationFilter, setModerationFilter] = React.useState(
    filter ?? "all",
  );
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<{
    action: "approve" | "reject" | "hide" | "restore";
    listingId: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const moderationStatus =
    moderationFilter === "all"
      ? undefined
      : (moderationFilter as ListingModerationStatus);

  const params = React.useMemo(
    () => ({ page, moderationStatus }),
    [page, moderationStatus],
  );
  const initialParams = React.useMemo(
    () => ({
      page: initialPage,
      moderationStatus:
        (filter ?? "all") === "all"
          ? undefined
          : (filter as ListingModerationStatus),
    }),
    [filter, initialPage],
  );

  const listingsQuery = useAdminListQuery({
    queryKey: queryKeys.admin.listings(page, moderationFilter),
    fetcher: fetchAdminListingsPageAction,
    params,
    initialParams,
    initialData: initial,
  });

  const data = listingsQuery.data ?? initial;

  async function runAction() {
    if (!pending || reason.trim().length < 3) {
      toast.error("Moderation reason is required.");
      return;
    }
    setLoading(true);
    const payload = { listingId: pending.listingId, reason };
    const result =
      pending.action === "approve"
        ? await approveListingAction(payload)
        : pending.action === "reject"
          ? await rejectListingAction(payload)
          : pending.action === "hide"
            ? await hideListingAction(payload)
            : await restoreListingAction(payload);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Listing updated.");
    setPending(null);
    setReason("");
    invalidate(queryKeys.admin.listings());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Listing moderation</h1>
          <p className="text-muted-foreground text-sm">
            {data.total} listings
            {listingsQuery.isFetching ? " · updating…" : null}
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "PENDING", "REJECTED", "HIDDEN"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setModerationFilter(f);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                moderationFilter === f
                  ? "bg-brand-blue-soft text-brand-blue"
                  : ""
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        rows={data.items}
        getRowKey={(r) => r.id}
        columns={[
          { key: "title", header: "Listing", render: (r) => r.title },
          { key: "seller", header: "Seller", render: (r) => r.sellerName },
          { key: "city", header: "City", render: (r) => r.city },
          { key: "status", header: "Status", render: (r) => r.status },
          {
            key: "moderation",
            header: "Moderation",
            render: (r) => r.moderationStatus,
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ action: "approve", listingId: r.id })
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ action: "reject", listingId: r.id })
                  }
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ action: "hide", listingId: r.id })
                  }
                >
                  Hide
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ action: "restore", listingId: r.id })
                  }
                >
                  Restore
                </button>
              </div>
            ),
          },
        ]}
      />

      <TablePagination
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        title="Moderation action"
        description="Reason is required and stored in the audit log."
        loading={loading}
        onConfirm={() => void runAction()}
        onClose={() => setPending(null)}
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Moderation reason"
          className="border-border min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </ConfirmDialog>
    </div>
  );
}
