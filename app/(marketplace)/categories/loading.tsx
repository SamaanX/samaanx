export default function CategoriesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="bg-muted h-10 w-48 animate-pulse rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted h-28 animate-pulse rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
