"use client";

import * as React from "react";

import { fetchAdminActivityPageAction } from "@/features/admin/actions/page-queries";
import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import { useAdminListQuery } from "@/features/admin/hooks/use-admin-list-query";
import type { AdminAuditRow, Paginated } from "@/features/admin/types/admin";
import { queryKeys } from "@/lib/query-keys";

export function AdminActivityClient({
  initial,
  initialPage,
}: {
  initial: Paginated<AdminAuditRow>;
  initialPage: number;
}) {
  const [page, setPage] = React.useState(initialPage);

  const params = React.useMemo(() => ({ page }), [page]);
  const initialParams = React.useMemo(
    () => ({ page: initialPage }),
    [initialPage],
  );

  const activityQuery = useAdminListQuery({
    queryKey: queryKeys.admin.activity(page),
    fetcher: fetchAdminActivityPageAction,
    params,
    initialParams,
    initialData: initial,
  });

  const data = activityQuery.data ?? initial;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity log</h1>
        <p className="text-muted-foreground text-sm">
          Every admin action is recorded.
          {activityQuery.isFetching ? " · updating…" : null}
        </p>
      </div>
      <DataTable
        rows={data.items}
        getRowKey={(r) => r.id}
        columns={[
          {
            key: "when",
            header: "When",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            key: "who",
            header: "Admin",
            render: (r) => r.actorName ?? "System",
          },
          { key: "action", header: "Action", render: (r) => r.action },
          {
            key: "entity",
            header: "Entity",
            render: (r) => `${r.entityType} · ${r.entityId.slice(0, 8)}…`,
          },
          { key: "reason", header: "Reason", render: (r) => r.reason ?? "—" },
        ]}
      />
      <TablePagination
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
