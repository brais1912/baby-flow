import { PageHeaderSkeleton, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-10 w-10" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </SkeletonCard>

      {[0, 1].map((i) => (
        <SkeletonCard key={i}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
