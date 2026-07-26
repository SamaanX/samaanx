export function PublicProfileLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="border-border/60 bg-muted/40 h-56 animate-pulse rounded-[1.5rem] border" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <div className="bg-muted/40 h-28 animate-pulse rounded-2xl" />
          <div className="bg-muted/40 h-28 animate-pulse rounded-2xl" />
        </div>
        <div className="bg-muted/40 h-48 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}

export default function Loading() {
  return <PublicProfileLoading />;
}
