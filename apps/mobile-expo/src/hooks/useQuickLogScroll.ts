import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export const QUICK_LOG_SCROLL_THRESHOLD = 18;
const TOP_RESET_OFFSET = 8;

export type QuickLogScrollState = {
  offset: number;
  direction: "up" | "down" | null;
  distance: number;
  compact: boolean;
};

export const initialQuickLogScrollState: QuickLogScrollState = {
  offset: 0,
  direction: null,
  distance: 0,
  compact: false,
};

export function nextQuickLogScrollState(
  state: QuickLogScrollState,
  nextOffset: number
): QuickLogScrollState {
  const offset = Math.max(0, nextOffset);
  if (offset <= TOP_RESET_OFFSET) {
    return { offset, direction: null, distance: 0, compact: false };
  }

  const delta = offset - state.offset;
  if (Math.abs(delta) < 1) return { ...state, offset };
  const direction = delta > 0 ? "down" : "up";
  const distance = state.direction === direction
    ? state.distance + Math.abs(delta)
    : Math.abs(delta);
  if (distance < QUICK_LOG_SCROLL_THRESHOLD) {
    return { ...state, offset, direction, distance };
  }

  return {
    offset,
    direction,
    distance: 0,
    compact: direction === "down",
  };
}

export function useQuickLogScroll(onCompactChange: (compact: boolean) => void) {
  const state = useRef(initialQuickLogScrollState);

  return useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = nextQuickLogScrollState(state.current, event.nativeEvent.contentOffset.y);
    if (next.compact !== state.current.compact) onCompactChange(next.compact);
    state.current = next;
  }, [onCompactChange]);
}
