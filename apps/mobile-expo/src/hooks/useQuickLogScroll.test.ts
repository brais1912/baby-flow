import { describe, expect, it } from "vitest";
import {
  initialQuickLogScrollState,
  nextQuickLogScrollState,
  QUICK_LOG_SCROLL_THRESHOLD,
} from "./useQuickLogScroll";

describe("QuickLog scroll state", () => {
  it("compacts after deliberate downward scrolling", () => {
    const belowThreshold = nextQuickLogScrollState(
      initialQuickLogScrollState,
      QUICK_LOG_SCROLL_THRESHOLD - 1
    );
    expect(belowThreshold.compact).toBe(false);

    const compact = nextQuickLogScrollState(belowThreshold, QUICK_LOG_SCROLL_THRESHOLD + 4);
    expect(compact.compact).toBe(true);
  });

  it("restores after deliberate upward scrolling", () => {
    const compact = {
      ...initialQuickLogScrollState,
      offset: 100,
      compact: true,
    };
    const restored = nextQuickLogScrollState(compact, 80);
    expect(restored.compact).toBe(false);
  });

  it("ignores small direction changes and always restores near the top", () => {
    const compact = {
      ...initialQuickLogScrollState,
      offset: 100,
      compact: true,
    };
    const noise = nextQuickLogScrollState(compact, 96);
    expect(noise.compact).toBe(true);
    expect(nextQuickLogScrollState(noise, 4).compact).toBe(false);
  });
});
