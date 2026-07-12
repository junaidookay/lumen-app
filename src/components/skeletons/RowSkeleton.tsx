export function CardSkeleton({ landscape }: { landscape?: boolean }) {
  return (
    <div
      className={
        "shimmer relative shrink-0 overflow-hidden rounded-2xl " +
        (landscape ? "aspect-video w-[320px]" : "aspect-[2/3] w-[200px]")
      }
    >
      <div className="shimmer-inner" />
    </div>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="px-4 sm:px-6 lg:px-10">
      <div className="shimmer relative mb-4 h-6 w-40 overflow-hidden rounded-md">
        <div className="shimmer-inner" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}