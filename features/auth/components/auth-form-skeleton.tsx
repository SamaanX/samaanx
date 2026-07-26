export function AuthFormSkeleton() {
  return (
    <div
      className="animate-pulse space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto mb-8 space-y-2 text-center">
        <div className="bg-muted mx-auto h-4 w-16 rounded" />
        <div className="bg-muted mx-auto h-7 w-40 rounded" />
        <div className="bg-muted mx-auto h-4 w-56 rounded" />
      </div>
      <div className="bg-muted h-12 w-full rounded-xl" />
      <div className="bg-muted h-4 w-full rounded" />
      <div className="bg-muted h-12 w-full rounded-xl" />
      <div className="bg-muted h-12 w-full rounded-xl" />
      <div className="bg-muted h-12 w-full rounded-xl" />
      <span className="sr-only">Checking session…</span>
    </div>
  );
}
