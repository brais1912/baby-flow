import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculatePullDistance, PullToRefresh } from "./PullToRefresh";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function dispatchTouch(target: Element, type: string, clientY?: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: clientY === undefined ? [] : [{ clientY }],
  });
  target.dispatchEvent(event);
}

describe("calculatePullDistance", () => {
  it("ignores upward movement and damps downward movement", () => {
    expect(calculatePullDistance(100, 80)).toBe(0);
    expect(calculatePullDistance(100, 180)).toBe(40);
  });

  it("caps long pulls", () => {
    expect(calculatePullDistance(0, 500)).toBe(96);
  });
});

describe("PullToRefresh", () => {
  beforeEach(() => {
    refresh.mockClear();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("refreshes after pulling beyond the threshold", () => {
    const { getByText } = render(
      <PullToRefresh>
        <div>content</div>
      </PullToRefresh>
    );
    const content = getByText("content");

    act(() => {
      dispatchTouch(content, "touchstart", 100);
      dispatchTouch(content, "touchmove", 240);
      dispatchTouch(content, "touchend");
    });

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh for a short pull or when the page is scrolled", () => {
    const { getByText } = render(
      <PullToRefresh>
        <div>content</div>
      </PullToRefresh>
    );
    const content = getByText("content");

    act(() => {
      dispatchTouch(content, "touchstart", 100);
      dispatchTouch(content, "touchmove", 160);
      dispatchTouch(content, "touchend");
    });
    expect(refresh).not.toHaveBeenCalled();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 10 });
    act(() => {
      dispatchTouch(content, "touchstart", 100);
      dispatchTouch(content, "touchmove", 260);
      dispatchTouch(content, "touchend");
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
