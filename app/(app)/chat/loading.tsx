export default function ChatLoading() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
      <div className="bg-muted h-14 w-full animate-pulse rounded-2xl" />
      <div className="mt-4 flex-1 space-y-3 overflow-hidden">
        <div className="bg-muted ml-auto h-16 w-[70%] animate-pulse rounded-2xl" />
        <div className="bg-muted h-16 w-[65%] animate-pulse rounded-2xl" />
        <div className="bg-muted ml-auto h-16 w-[60%] animate-pulse rounded-2xl" />
      </div>
      <div className="bg-muted mt-4 h-12 w-full animate-pulse rounded-xl" />
    </div>
  );
}
