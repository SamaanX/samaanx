"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  banReportUserAction,
  removeReportedListingAction,
  updateReportStatusAction,
  warnReportUserAction,
} from "@/features/admin/actions/report-actions";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import type { AdminReportRow, Paginated } from "@/features/admin/types/admin";

export function AdminReportsClient({
  initial,
}: {
  initial: Paginated<AdminReportRow>;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<{
    reportId: string;
    action: "dismiss" | "review" | "warn" | "ban" | "remove";
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function runAction() {
    if (!pending || reason.trim().length < 3) {
      toast.error("Reason is required.");
      return;
    }
    setLoading(true);
    let result;
    if (pending.action === "dismiss") {
      result = await updateReportStatusAction({
        reportId: pending.reportId,
        status: "DISMISSED",
        reason,
      });
    } else if (pending.action === "review") {
      result = await updateReportStatusAction({
        reportId: pending.reportId,
        status: "IN_REVIEW",
        reason,
      });
    } else if (pending.action === "warn") {
      result = await warnReportUserAction({
        reportId: pending.reportId,
        reason,
        resolutionNotes: reason,
      });
    } else if (pending.action === "ban") {
      result = await banReportUserAction({
        reportId: pending.reportId,
        reason,
        resolutionNotes: reason,
      });
    } else {
      result = await removeReportedListingAction({
        reportId: pending.reportId,
        reason,
        resolutionNotes: reason,
      });
    }
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Report updated.");
    setPending(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">{initial.total} total</p>
      </div>

      <DataTable
        rows={initial.items}
        getRowKey={(r) => r.id}
        columns={[
          { key: "type", header: "Type", render: (r) => r.type },
          {
            key: "target",
            header: "Target",
            render: (r) => `${r.targetType} · ${r.targetId.slice(0, 8)}…`,
          },
          { key: "reason", header: "Reason", render: (r) => r.reason },
          {
            key: "reporter",
            header: "Reporter",
            render: (r) => r.reporterName,
          },
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
                    setPending({ reportId: r.id, action: "review" })
                  }
                >
                  Review
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ reportId: r.id, action: "dismiss" })
                  }
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => setPending({ reportId: r.id, action: "warn" })}
                >
                  Warn
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => setPending({ reportId: r.id, action: "ban" })}
                >
                  Ban
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setPending({ reportId: r.id, action: "remove" })
                  }
                >
                  Remove listing
                </button>
              </div>
            ),
          },
        ]}
      />

      <TablePagination
        page={initial.page}
        totalPages={initial.totalPages}
        onPageChange={(page) => router.push(`/admin/reports?page=${page}`)}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        title="Report action"
        description="Provide a reason — this is audit logged."
        loading={loading}
        onConfirm={() => void runAction()}
        onClose={() => setPending(null)}
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-border min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Reason"
        />
      </ConfirmDialog>
    </div>
  );
}
