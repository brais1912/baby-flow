export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />;
}

export function SkeletonCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}
