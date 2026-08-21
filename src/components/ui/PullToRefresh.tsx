"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD = 64;
const MAX_PULL_DISTANCE = 96;
const REFRESH_DISTANCE = 56;

const TRANSLATE_CLASSES = [
  "translate-y-[0px]",
  "translate-y-[6px]",
  "translate-y-[12px]",
  "translate-y-[18px]",
  "translate-y-[24px]",
  "translate-y-[30px]",
  "translate-y-[36px]",
  "translate-y-[42px]",
  "translate-y-[48px]",
  "translate-y-[54px]",
  "translate-y-[60px]",
  "translate-y-[66px]",
  "translate-y-[72px]",
  "translate-y-[78px]",
  "translate-y-[84px]",
  "translate-y-[90px]",
  "translate-y-[96px]",
] as const;

export function calculatePullDistance(startY: number, currentY: number): number {
  return Math.min(MAX_PULL_DISTANCE, Math.max(0, (currentY - startY) * 0.5));
}

function translateClass(distance: number): string {
  const index = Math.min(TRANSLATE_CLASSES.length - 1, Math.floor(distance / 6));
  return TRANSLATE_CLASSES[index];
}

function hasScrolledContainer(target: EventTarget | null, boundary: HTMLElement): boolean {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== boundary) {
    if (element.scrollHeight > element.clientHeight && element.scrollTop > 0) return true;
    element = element.parentElement;
  }

  return false;
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations("nav");
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef({ active: false, startY: 0 });
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const boundary = root;

    function resetGesture() {
      gesture.current.active = false;
      pullDistanceRef.current = 0;
      setIsDragging(false);
      setPullDistance(0);
    }

    function handleTouchStart(event: TouchEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const isOverlay = target?.closest('[role="dialog"], [aria-modal="true"], .fixed.inset-0');

      if (
        isRefreshing ||
        event.touches.length !== 1 ||
        window.scrollY > 0 ||
        isOverlay ||
        hasScrolledContainer(event.target, boundary)
      ) {
        return;
      }

      gesture.current = { active: true, startY: event.touches[0].clientY };
    }

    function handleTouchMove(event: TouchEvent) {
      if (!gesture.current.active || event.touches.length !== 1) return;

      if (window.scrollY > 0) {
        resetGesture();
        return;
      }

      const distance = calculatePullDistance(gesture.current.startY, event.touches[0].clientY);
      if (distance === 0) return;

      event.preventDefault();
      pullDistanceRef.current = distance;
      setIsDragging(true);
      setPullDistance(distance);
    }

    function handleTouchEnd() {
      if (!gesture.current.active) return;

      const shouldRefresh = pullDistanceRef.current >= PULL_THRESHOLD;
      resetGesture();

      if (shouldRefresh) {
        startRefresh(() => router.refresh());
      }
    }

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd);
    root.addEventListener("touchcancel", resetGesture);

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", resetGesture);
    };
  }, [isRefreshing, router]);

  const visibleDistance = isRefreshing ? REFRESH_DISTANCE : pullDistance;
  const isReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={rootRef}
      className={`relative ${translateClass(visibleDistance)} ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
    >
      <div
        className={`pointer-events-none absolute left-1/2 -top-12 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-purple-600 shadow-md transition-opacity ${visibleDistance > 0 ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        {isRefreshing ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
        ) : (
          <span className={`text-lg leading-none transition-transform duration-150 ${isReady ? "rotate-180" : ""}`}>↓</span>
        )}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {isRefreshing ? t("refreshing") : isReady ? t("releaseToRefresh") : ""}
      </span>

      {children}
    </div>
  );
}
