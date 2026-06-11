import { PageHeaderSkeleton, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function InsightsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-10 w-10" />
      </div>

      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-48 w-full" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}
