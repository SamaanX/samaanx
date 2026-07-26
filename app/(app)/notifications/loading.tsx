export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-10 sm:px-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded-xl" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="bg-muted h-24 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
