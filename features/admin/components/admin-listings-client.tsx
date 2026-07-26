"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  approveListingAction,
  hideListingAction,
  rejectListingAction,
  restoreListingAction,
} from "@/features/admin/actions/listing-actions";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import type { AdminListingRow, Paginated } from "@/features/admin/types/admin";

type AdminListingsClientProps = {
  initial: Paginated<AdminListingRow>;
  filter?: string;
};

export function AdminListingsClient({
  initial,
  filter,
}: AdminListingsClientProps) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<{
    action: "approve" | "reject" | "hide" | "restore";
    listingId: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

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
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Listing moderation</h1>
          <p className="text-muted-foreground text-sm">
            {initial.total} listings
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "PENDING", "REJECTED", "HIDDEN"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() =>
                router.push(
                  f === "all"
                    ? "/admin/listings"
                    : `/admin/listings?moderation=${f}`,
                )
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                (filter ?? "all") === f
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
        rows={initial.items}
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
        page={initial.page}
        totalPages={initial.totalPages}
        onPageChange={(page) => router.push(`/admin/listings?page=${page}`)}
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
