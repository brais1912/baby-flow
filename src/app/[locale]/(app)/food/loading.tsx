import { PageHeaderSkeleton, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function FoodLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-48 w-full rounded-3xl" />

      {[0, 1, 2].map((i) => (
        <SkeletonCard key={i}>
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}