import { describe, it, expect, vi, afterEach } from "vitest";
import { eventTimePicker } from "./EventEditSheet";
import type { Event } from "@/lib/db/schema";

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "id-1",
    userId: "user-1",
    type: "diaper",
    occurredAt: new Date(),
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("eventTimePicker", () => {
  it("maps today's event to dayOffset 0 keeping hour and minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));

    const value = eventTimePicker(makeEvent({ occurredAt: new Date("2024-01-15T08:45:00") }));

    expect(value).toEqual({ dayOffset: 0, hour: 8, minute: 45 });
  });

  it("maps yesterday's event to dayOffset 1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));

    const value = eventTimePicker(makeEvent({ occurredAt: new Date("2024-01-14T22:10:00") }));

    expect(value).toEqual({ dayOffset: 1, hour: 22, minute: 10 });
  });

  it("clamps events older than two days to dayOffset 2", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));

    const value = eventTimePicker(makeEvent({ occurredAt: new Date("2024-01-10T09:00:00") }));

    expect(value).toEqual({ dayOffset: 2, hour: 9, minute: 0 });
  });

  it("clamps future events to dayOffset 0", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));

    const value = eventTimePicker(makeEvent({ occurredAt: new Date("2024-01-16T09:00:00") }));

    expect(value).toEqual({ dayOffset: 0, hour: 9, minute: 0 });
  });
});