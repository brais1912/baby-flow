import { describe, expect, it } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { eventPhaseDuration } from "./eventDurations";

function event(id: string, type: EventType, occurredAt: Date): BabyEvent {
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

describe("eventPhaseDuration", () => {
  it("shows awake time on sleep events using the latest preceding wake-up", () => {
    const firstWake = event("wake-1", "wake_up", new Date(2026, 7, 21, 10));
    const latestWake = event("wake-2", "wake_up", new Date(2026, 7, 21, 12));
    const sleep = event("sleep", "sleep", new Date(2026, 7, 21, 13, 30));
    expect(eventPhaseDuration(sleep, [sleep, firstWake, latestWake])).toEqual({
      kind: "awake",
      durationMs: 90 * 60_000,
    });
  });

  it("shows sleep time on wake-up events using the latest preceding sleep", () => {
    const firstSleep = event("sleep-1", "sleep", new Date(2026, 7, 20, 20));
    const latestSleep = event("sleep-2", "sleep", new Date(2026, 7, 21, 1));
    const wake = event("wake", "wake_up", new Date(2026, 7, 21, 7));
    expect(eventPhaseDuration(wake, [firstSleep, wake, latestSleep])).toEqual({
      kind: "sleep",
      durationMs: 6 * 60 * 60_000,
    });
  });

  it("returns null for unrelated events, missing predecessors, and future phases", () => {
    const sleep = event("sleep", "sleep", new Date(2026, 7, 21, 13));
    const futureWake = event("wake", "wake_up", new Date(2026, 7, 21, 14));
    const feeding = event("feed", "feeding", new Date(2026, 7, 21, 15));
    expect(eventPhaseDuration(sleep, [sleep, futureWake])).toBeNull();
    expect(eventPhaseDuration(futureWake, [futureWake])).toBeNull();
    expect(eventPhaseDuration(feeding, [sleep, futureWake, feeding])).toBeNull();
  });
});
