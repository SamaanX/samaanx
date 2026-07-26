import { cn } from "@/lib/utils";

export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border/80 bg-card overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-xs)]",
        className,
      )}
    >
      <div className="bg-muted aspect-[4/3] animate-pulse" />
      <div className="space-y-2 p-3.5">
        <div className="bg-muted h-4 w-[80%] animate-pulse rounded" />
        <div className="bg-muted h-3 w-[33%] animate-pulse rounded" />
        <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        <div className="flex justify-between pt-1">
          <div className="bg-muted h-4 w-[33%] animate-pulse rounded" />
          <div className="bg-muted h-3 w-10 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border-border bg-muted/60 h-28 animate-pulse rounded-2xl border"
        />
      ))}
    </div>
  );
}

export function HomeListingSectionSkeleton({
  titleWidth = "w-40",
}: {
  titleWidth?: string;
}) {
  return (
    <section className="space-y-4">
      <div className={`bg-muted h-7 animate-pulse rounded ${titleWidth}`} />
      <ListingGridSkeleton count={4} />
    </section>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
      <div className="space-y-4">
        <div className="bg-muted h-8 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-muted h-24 w-full animate-pulse rounded-xl" />
        <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
