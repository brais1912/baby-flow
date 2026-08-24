import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchLatestSleepPhase,
  getDayWindowStartMinutes,
  updateEventTime,
} from "../lib/eventRepository";
import { dayWindowDate } from "../lib/events";
import { sendSleepTransitionUpdate } from "../lib/sleepNotificationService";
import type { BabyEvent } from "../types/events";
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

vi.mock("../lib/sleepNotificationService", () => ({
  sendSleepTransitionUpdate: vi.fn().mockResolvedValue(false),
}));

function sleepEvent(id: string, occurredAt: Date): BabyEvent {
  return {
    id,
    userId: "user-1",
    type: "sleep",
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("useEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDayWindowStartMinutes).mockResolvedValue(720);
    vi.mocked(fetchEvents).mockResolvedValue([]);
    vi.mocked(fetchLatestSleepPhase).mockResolvedValue(null);
  });

  it("returns to the current owner day when pull-to-refresh is requested", async () => {
    const expectedToday = dayWindowDate(new Date(), 720);
    const { result } = renderHook(() => useEvents("user-1", {
      name: "Luna",
      dateOfBirth: "2026-02-01",
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.selectAdjacentDay(-1));
    expect(result.current.selectedDay.getTime()).toBeLessThan(expectedToday.getTime());

    await act(async () => result.current.refreshToday());
    expect(result.current.selectedDay).toEqual(expectedToday);
  });

  it("emits a transition update only after creation, never after edits or deletes", async () => {
    const occurredAt = new Date();
    const created = sleepEvent("sleep-1", occurredAt);
    const updated = { ...created, occurredAt: new Date(occurredAt.getTime() + 60_000) };
    vi.mocked(createEvent).mockResolvedValue(created);
    vi.mocked(updateEventTime).mockResolvedValue(updated);
    vi.mocked(deleteEvent).mockResolvedValue(undefined);
    const { result } = renderHook(() => useEvents("user-1", {
      name: "Luna",
      dateOfBirth: "2026-02-01",
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create({ type: "sleep", occurredAt });
    });
    expect(sendSleepTransitionUpdate).toHaveBeenCalledOnce();

    await act(async () => {
      await result.current.updateTime(created, updated.occurredAt);
      await result.current.remove(created.id);
    });
    expect(sendSleepTransitionUpdate).toHaveBeenCalledOnce();
  });
});
