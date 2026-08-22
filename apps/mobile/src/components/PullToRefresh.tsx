import { useRef, useState } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";

const THRESHOLD = 72;

export function PullToRefresh({ onRefresh, children }: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const distanceLevel = Math.min(Math.round(distance / 8), 12);

  function touchStart(event: React.TouchEvent) {
    if (window.scrollY <= 0) startY.current = event.touches[0]?.clientY ?? null;
  }

  function touchMove(event: React.TouchEvent) {
    if (startY.current === null || window.scrollY > 0) return;
    const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current;
    setDistance(Math.min(Math.max(delta * 0.55, 0), 96));
  }

  async function touchEnd() {
    startY.current = null;
    if (distance < THRESHOLD || refreshing) {
      setDistance(0);
      return;
    }

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setDistance(0);
    }
  }

  return (
    <div className="pull-region" onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={() => void touchEnd()}>
      <div
        className={refreshing ? "pull-indicator refreshing" : `pull-indicator distance-${distanceLevel}`}
        aria-hidden={distance === 0 && !refreshing}
      >
        {refreshing ? <RefreshCw size={18} /> : <ArrowDown className={distance >= THRESHOLD ? "ready" : ""} size={18} />}
      </div>
      {children}
    </div>
  );
}
