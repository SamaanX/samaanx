"use client";

import { useRouter } from "next/navigation";

import {
  DataTable,
  TablePagination,
} from "@/features/admin/components/data-table";
import type { AdminAuditRow, Paginated } from "@/features/admin/types/admin";

export function AdminActivityClient({
  initial,
}: {
  initial: Paginated<AdminAuditRow>;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity log</h1>
        <p className="text-muted-foreground text-sm">
          Every admin action is recorded.
        </p>
      </div>
      <DataTable
        rows={initial.items}
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
        page={initial.page}
        totalPages={initial.totalPages}
        onPageChange={(page) => router.push(`/admin/activity?page=${page}`)}
      />
    </div>
  );
}
