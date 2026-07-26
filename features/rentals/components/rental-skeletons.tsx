export function RentalCardSkeleton() {
  return (
    <div className="border-border/80 bg-card overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-xs)]">
      <div className="flex gap-3 p-4">
        <div className="bg-muted size-20 shrink-0 animate-pulse rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted h-4 w-[66%] animate-pulse rounded" />
          <div className="bg-muted h-3 w-[33%] animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

export function RentalListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <RentalCardSkeleton key={index} />
      ))}
    </div>
  );
}
