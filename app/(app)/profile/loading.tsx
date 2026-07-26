export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:max-w-5xl">
      <div className="border-border/70 bg-card rounded-[1.35rem] border px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="bg-muted size-[5.5rem] animate-pulse rounded-[1.25rem] sm:size-24" />
          <div className="w-full space-y-2 sm:pt-1">
            <div className="bg-muted mx-auto h-7 w-48 animate-pulse rounded-lg sm:mx-0" />
            <div className="bg-muted mx-auto h-4 w-64 animate-pulse rounded-lg sm:mx-0" />
            <div className="bg-muted mx-auto h-3 w-40 animate-pulse rounded-lg sm:mx-0" />
          </div>
        </div>
        <div className="border-border/50 mt-5 grid grid-cols-3 gap-2 border-t pt-5 sm:gap-3">
          <div className="bg-muted h-16 animate-pulse rounded-xl" />
          <div className="bg-muted h-16 animate-pulse rounded-xl" />
          <div className="bg-muted h-16 animate-pulse rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
        <div className="bg-muted h-96 animate-pulse rounded-[1.35rem]" />
        <div className="bg-muted h-72 animate-pulse rounded-[1.35rem]" />
      </div>
    </div>
  );
}
