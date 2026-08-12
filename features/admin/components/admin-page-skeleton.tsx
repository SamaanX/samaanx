export function AdminPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading admin page">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
        <div className="bg-muted h-4 w-32 animate-pulse rounded-lg" />
      </div>
      <div className="bg-muted h-10 w-full max-w-md animate-pulse rounded-xl" />
      <div className="border-border overflow-hidden rounded-xl border">
        <div className="bg-muted/70 h-11 animate-pulse" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-muted/40 h-14 animate-pulse border-t"
          />
        ))}
      </div>
    </div>
  );
}
