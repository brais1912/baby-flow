import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchEvents,
  fetchLatestSleepPhase,
  getDayWindowStartMinutes,
} from "../lib/eventRepository";
import { dayWindowDate } from "../lib/events";
import { useEvents } from "./useEvents";

vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/eventRepository", () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  fetchEvents: vi.fn(),
  fetchLatestSleepPhase: vi.fn(),
  getDayWindowStartMinutes: vi.fn(),
  updateEventTime: vi.fn(),
}));

describe("useEvents", () => {
  beforeEach(() => {
    vi.mocked(getDayWindowStartMinutes).mockResolvedValue(720);
    vi.mocked(fetchEvents).mockResolvedValue([]);
    vi.mocked(fetchLatestSleepPhase).mockResolvedValue(null);
  });

  it("returns to the current owner day when pull-to-refresh is requested", async () => {
    const expectedToday = dayWindowDate(new Date(), 720);
    const { result } = renderHook(() => useEvents("user-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.selectAdjacentDay(-1));
    expect(result.current.selectedDay.getTime()).toBeLessThan(expectedToday.getTime());

    await act(async () => result.current.refreshToday());
    expect(result.current.selectedDay).toEqual(expectedToday);
  });
});
