export default function AppSegmentLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-32 w-full animate-pulse rounded-2xl" />
      <div className="bg-muted h-32 w-full animate-pulse rounded-2xl" />
    </div>
  );
}
