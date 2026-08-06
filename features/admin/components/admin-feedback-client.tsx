"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { updateFeedbackStatusAction } from "@/features/admin/actions/feedback-actions";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import type { AdminFeedbackRow, Paginated } from "@/features/admin/types/admin";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/types/feedback";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
] as const;

export function AdminFeedbackClient({
  initial,
  statusFilter,
}: {
  initial: Paginated<AdminFeedbackRow>;
  statusFilter?: string;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [adminNotes, setAdminNotes] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<{
    feedbackId: string;
    status: "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  function setFilter(status: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(`/admin/feedback?${params.toString()}`);
  }

  async function runAction() {
    if (!pending || reason.trim().length < 3) {
      toast.error("Reason is required.");
      return;
    }
    setLoading(true);
    const result = await updateFeedbackStatusAction({
      feedbackId: pending.feedbackId,
      status: pending.status,
      reason,
      adminNotes: adminNotes.trim() || null,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Feedback updated.");
    setPending(null);
    setReason("");
    setAdminNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">User feedback</h1>
        <p className="text-muted-foreground text-sm">
          {initial.total} submission{initial.total === 1 ? "" : "s"} from
          profile
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.value)}
            className={
              (statusFilter ?? "") === f.value
                ? "bg-brand-blue-soft text-brand-blue rounded-full px-3 py-1.5 text-sm font-medium"
                : "bg-muted/60 text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-sm"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        rows={initial.items}
        getRowKey={(r) => r.id}
        emptyMessage="No feedback yet."
        columns={[
          {
            key: "category",
            header: "Category",
            render: (r) => r.category,
          },
          {
            key: "subject",
            header: "Subject",
            render: (r) => (
              <button
                type="button"
                className="text-brand-blue text-left font-medium hover:underline"
                onClick={() =>
                  setExpandedId((id) => (id === r.id ? null : r.id))
                }
              >
                {r.subject}
              </button>
            ),
          },
          {
            key: "user",
            header: "User",
            render: (r) => (
              <div>
                <p>{r.userName}</p>
                <p className="text-muted-foreground text-xs">{r.userEmail}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => FEEDBACK_STATUS_LABELS[r.status] ?? r.status,
          },
          {
            key: "date",
            header: "Submitted",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.status === "OPEN" ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() =>
                      setPending({ feedbackId: r.id, status: "IN_REVIEW" })
                    }
                  >
                    Review
                  </button>
                ) : null}
                {r.status !== "RESOLVED" ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() =>
                      setPending({ feedbackId: r.id, status: "RESOLVED" })
                    }
                  >
                    Resolve
                  </button>
                ) : null}
                {r.status !== "DISMISSED" ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() =>
                      setPending({ feedbackId: r.id, status: "DISMISSED" })
                    }
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      {expandedId ? (
        <div className="border-border/70 bg-card space-y-2 rounded-xl border p-4 text-sm">
          {(() => {
            const row = initial.items.find((r) => r.id === expandedId);
            if (!row) return null;
            return (
              <>
                <p className="font-medium">{row.subject}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {row.message}
                </p>
                {row.pageUrl ? (
                  <p className="text-muted-foreground text-xs">
                    Page: {row.pageUrl}
                  </p>
                ) : null}
                {row.adminNotes ? (
                  <p className="border-border/60 border-t pt-2 text-xs">
                    <span className="font-medium">Admin notes:</span>{" "}
                    {row.adminNotes}
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : null}

      <TablePagination
        page={initial.page}
        totalPages={initial.totalPages}
        onPageChange={(page) => {
          const params = new URLSearchParams();
          params.set("page", String(page));
          if (statusFilter) params.set("status", statusFilter);
          router.push(`/admin/feedback?${params.toString()}`);
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        title="Update feedback"
        description="Add an internal reason and optional notes for the team."
        confirmLabel="Save"
        loading={loading}
        onClose={() => {
          setPending(null);
          setReason("");
          setAdminNotes("");
        }}
        onConfirm={() => void runAction()}
      >
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Reason</span>
            <textarea
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you changing the status?"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Admin notes (optional)</span>
            <textarea
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this feedback"
            />
          </label>
        </div>
      </ConfirmDialog>
    </div>
  );
}
