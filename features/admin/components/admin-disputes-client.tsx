"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { updateDisputeAction } from "@/features/admin/actions/dispute-actions";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import type { AdminDisputeRow, Paginated } from "@/features/admin/types/admin";

export function AdminDisputesClient({
  initial,
}: {
  initial: Paginated<AdminDisputeRow>;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState<{
    disputeId: string;
    status: "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function runAction() {
    if (!pending || reason.trim().length < 3) {
      toast.error("Reason is required.");
      return;
    }
    setLoading(true);
    const result = await updateDisputeAction({
      disputeId: pending.disputeId,
      status: pending.status,
      reason,
      adminNotes: notes || undefined,
      resolution: pending.status === "RESOLVED" ? notes || reason : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Dispute updated.");
    setPending(null);
    setReason("");
    setNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dispute center</h1>
        <p className="text-muted-foreground text-sm">
          {initial.total} disputes
        </p>
      </div>

      <DataTable
        rows={initial.items}
        getRowKey={(r) => r.id}
        columns={[
          {
            key: "listing",
            header: "Listing",
            render: (r) => (
              <Link
                href={`/admin/disputes/${r.id}`}
                className="hover:text-brand-blue font-medium"
              >
                {r.listingTitle}
              </Link>
            ),
          },
          { key: "buyer", header: "Buyer", render: (r) => r.buyerName },
          { key: "seller", header: "Seller", render: (r) => r.sellerName },
          { key: "status", header: "Status", render: (r) => r.status },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ disputeId: r.id, status: "UNDER_REVIEW" })
                  }
                >
                  Review
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ disputeId: r.id, status: "RESOLVED" })
                  }
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ disputeId: r.id, status: "REJECTED" })
                  }
                >
                  Reject
                </button>
              </div>
            ),
          },
        ]}
      />

      <TablePagination
        page={initial.page}
        totalPages={initial.totalPages}
        onPageChange={(page) => router.push(`/admin/disputes?page=${page}`)}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        title="Update dispute"
        description="Admin notes and reason are stored in the audit log."
        loading={loading}
        onConfirm={() => void runAction()}
        onClose={() => setPending(null)}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border-border min-h-16 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Admin notes / resolution"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-border min-h-16 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Reason (required)"
        />
      </ConfirmDialog>
    </div>
  );
}
