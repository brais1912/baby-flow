import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEvents } from "../lib/eventRepository";
import { useSleepInsights } from "./useSleepInsights";

vi.mock("../lib/eventRepository", () => ({
  fetchEvents: vi.fn(),
}));

describe("useSleepInsights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fetchEvents).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recomputes the latest owner day when reloading after its boundary", async () => {
    vi.setSystemTime(new Date(2026, 7, 24, 10));
    const { result } = renderHook(() => useSleepInsights({
      userId: "user-1",
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      startMinutes: 12 * 60,
      refreshToken: 0,
    }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.latestOwnerDate).toEqual(new Date(2026, 7, 23));

    vi.setSystemTime(new Date(2026, 7, 24, 13));
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.latestOwnerDate).toEqual(new Date(2026, 7, 24));
    expect(fetchEvents).toHaveBeenLastCalledWith(
      expect.anything(),
      "user-1",
      new Date(2026, 7, 10, 12),
      new Date(2026, 7, 25, 12)
    );
  });
});
