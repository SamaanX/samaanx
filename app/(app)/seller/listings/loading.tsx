export default function SellerListingsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
      <div className="bg-muted h-4 w-72 animate-pulse rounded-lg" />
      <div className="mt-6 space-y-3">
        <div className="bg-muted h-28 animate-pulse rounded-2xl" />
        <div className="bg-muted h-28 animate-pulse rounded-2xl" />
        <div className="bg-muted h-28 animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
