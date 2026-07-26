import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage = "No results.",
  getRowKey,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="border-border/70 bg-card/50 text-muted-foreground rounded-[var(--rp-radius-xl)] border border-dashed px-6 py-12 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border/70 bg-card overflow-hidden rounded-[var(--rp-radius-xl)] border shadow-[var(--rp-shadow-xs)]",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-border/60 bg-muted/30 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-border/40 hover:bg-muted/20 border-b last:border-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 align-middle", col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-muted-foreground text-xs">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border-border rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border-border rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
