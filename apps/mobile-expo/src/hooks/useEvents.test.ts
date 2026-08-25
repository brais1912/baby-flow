import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchLatestSleepPhase,
  getDayWindowStartMinutes,
  updateDayWindowStartMinutes,
  updateEventTime,
} from "../lib/eventRepository";
import { dayWindowDate } from "../lib/events";
import { sendSleepTransitionUpdate } from "../lib/sleepNotificationService";
import type { BabyEvent, EventType } from "../types/events";
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
  updateDayWindowStartMinutes: vi.fn(),
  updateEventTime: vi.fn(),
}));

vi.mock("../lib/sleepNotificationService", () => ({
  sendSleepTransitionUpdate: vi.fn().mockResolvedValue(false),
}));

function phaseEvent(id: string, type: EventType, occurredAt: Date): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
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

function deferred<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value: T) {
      if (!resolvePromise) throw new Error("DEFERRED_NOT_READY");
      resolvePromise(value);
    },
  };
}

describe("useEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDayWindowStartMinutes).mockResolvedValue(720);
    vi.mocked(fetchEvents).mockResolvedValue([]);
    vi.mocked(fetchLatestSleepPhase).mockResolvedValue(null);
    vi.mocked(updateDayWindowStartMinutes).mockResolvedValue(undefined);
  });

  it("persists a new owner-day start and reloads the current day with that boundary", async () => {
    const { result } = renderHook(() => useEvents("user-1", {
      name: "Luna",
      dateOfBirth: "2026-02-01",
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.saveDayWindowStart(10 * 60));

    expect(updateDayWindowStartMinutes).toHaveBeenCalledWith(expect.anything(), "user-1", 10 * 60);
    expect(result.current.dayWindowStartMinutes).toBe(10 * 60);
    expect(result.current.selectedDay).toEqual(dayWindowDate(new Date(), 10 * 60));
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
    const created = phaseEvent("sleep-1", "sleep", occurredAt);
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
    expect(sendSleepTransitionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      now: expect.any(Date),
    }));

    await act(async () => {
      await result.current.updateTime(created, updated.occurredAt);
      await result.current.remove(created.id);
    });
    expect(sendSleepTransitionUpdate).toHaveBeenCalledOnce();
  });

  it("does not let an older sleep-phase response overwrite a newly created wake-up", async () => {
    const initialResponse = deferred<BabyEvent | null>();
    const oldSleep = phaseEvent("sleep-1", "sleep", new Date(Date.now() - 60_000));
    const newWake = phaseEvent("wake-1", "wake_up", new Date());
    vi.mocked(fetchLatestSleepPhase)
      .mockImplementationOnce(() => initialResponse.promise)
      .mockResolvedValue(newWake);
    vi.mocked(createEvent).mockResolvedValue(newWake);

    const { result } = renderHook(() => useEvents("user-1", {
      name: "Luna",
      dateOfBirth: "2026-02-01",
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(fetchLatestSleepPhase).toHaveBeenCalledOnce());

    await act(async () => {
      await result.current.create({ type: "wake_up", occurredAt: newWake.occurredAt });
    });
    expect(result.current.sleepPhase?.id).toBe(newWake.id);

    await act(async () => {
      initialResponse.resolve(oldSleep);
      await initialResponse.promise;
    });
    expect(result.current.sleepPhase?.id).toBe(newWake.id);
  });
});
