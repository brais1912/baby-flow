import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function NewEventLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-10 w-10 rounded-2xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <SkeletonCard className="p-5">
        <div className="space-y-5">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}
