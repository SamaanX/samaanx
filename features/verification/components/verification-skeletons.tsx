export function VerificationPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-8 sm:px-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      <div className="bg-muted mx-auto size-60 animate-pulse rounded-2xl" />
      <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
      <div className="bg-muted h-12 w-full animate-pulse rounded-xl" />
    </div>
  );
}
