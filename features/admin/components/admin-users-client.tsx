"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { fetchAdminUsersPageAction } from "@/features/admin/actions/page-queries";
import {
  softDeleteUserAction,
  suspendUserAction,
  unsuspendUserAction,
  updateSellerVerificationAction,
  updateUserRoleAction,
} from "@/features/admin/actions/user-actions";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import {
  useAdminListQuery,
  useInvalidateAdminList,
} from "@/features/admin/hooks/use-admin-list-query";
import type { AdminUserRow, Paginated } from "@/features/admin/types/admin";
import { queryKeys } from "@/lib/query-keys";

type AdminUsersClientProps = {
  initial: Paginated<AdminUserRow>;
  viewerRole: "ADMIN" | "SUPER_ADMIN";
  initialQ?: string;
  initialPage: number;
};

export function AdminUsersClient({
  initial,
  viewerRole,
  initialQ = "",
  initialPage,
}: AdminUsersClientProps) {
  const invalidate = useInvalidateAdminList();
  const [q, setQ] = React.useState(initialQ);
  const [page, setPage] = React.useState(initialPage);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<{
    type: "suspend" | "unsuspend" | "delete" | "verify";
    userId: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const params = React.useMemo(
    () => ({ page, q: q.trim() || undefined }),
    [page, q],
  );
  const initialParams = React.useMemo(
    () => ({ page: initialPage, q: initialQ.trim() || undefined }),
    [initialPage, initialQ],
  );

  const usersQuery = useAdminListQuery({
    queryKey: queryKeys.admin.users(page, q.trim()),
    fetcher: fetchAdminUsersPageAction,
    params,
    initialParams,
    initialData: initial,
  });

  const data = usersQuery.data ?? initial;

  async function runAction() {
    if (!pending || reason.trim().length < 3) {
      toast.error("Reason is required.");
      return;
    }
    setLoading(true);
    let result;
    if (pending.type === "suspend") {
      result = await suspendUserAction({ userId: pending.userId, reason });
    } else if (pending.type === "unsuspend") {
      result = await unsuspendUserAction({ userId: pending.userId, reason });
    } else if (pending.type === "delete") {
      result = await softDeleteUserAction({ userId: pending.userId, reason });
    } else {
      result = await updateSellerVerificationAction({
        userId: pending.userId,
        verificationBadge: "VERIFIED",
        reason,
      });
    }
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("User updated.");
    setPending(null);
    setReason("");
    invalidate(queryKeys.admin.users());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">
            {data.total} accounts
            {usersQuery.isFetching ? " · updating…" : null}
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search email or name"
            className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>
      </div>

      <DataTable
        rows={data.items}
        getRowKey={(r) => r.id}
        columns={[
          {
            key: "user",
            header: "User",
            render: (r) => (
              <Link
                href={`/admin/users/${r.id}`}
                className="hover:text-brand-blue font-medium"
              >
                {r.displayName}
                <span className="text-muted-foreground block text-xs">
                  {r.email}
                </span>
              </Link>
            ),
          },
          { key: "role", header: "Role", render: (r) => r.role },
          { key: "status", header: "Status", render: (r) => r.status },
          { key: "mode", header: "Mode", render: (r) => r.preferredMode },
          {
            key: "badge",
            header: "Verified",
            render: (r) => r.verificationBadge,
          },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.status === "ACTIVE" ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() =>
                      setPending({ type: "suspend", userId: r.id })
                    }
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() =>
                      setPending({ type: "unsuspend", userId: r.id })
                    }
                  >
                    Unsuspend
                  </button>
                )}
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => setPending({ type: "verify", userId: r.id })}
                >
                  Verify
                </button>
                {viewerRole === "SUPER_ADMIN" ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={async () => {
                      const nextRole = r.role === "ADMIN" ? "USER" : "ADMIN";
                      const res = await updateUserRoleAction({
                        userId: r.id,
                        role: nextRole,
                        reason: "Role updated from admin panel",
                      });
                      if (!res.ok) toast.error(res.error.message);
                      else {
                        toast.success("Role updated");
                        invalidate(queryKeys.admin.users());
                      }
                    }}
                  >
                    {r.role === "ADMIN" ? "Remove admin" : "Make admin"}
                  </button>
                ) : null}
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
        title="Confirm admin action"
        description="This action is logged. Provide a reason."
        loading={loading}
        onConfirm={() => void runAction()}
        onClose={() => setPending(null)}
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          className="border-border min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </ConfirmDialog>
    </div>
  );
}
