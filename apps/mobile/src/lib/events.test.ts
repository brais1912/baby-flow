import { describe, expect, it } from "vitest";
import {
  assertValidSleepSequence,
  dayWindowBounds,
  dayWindowDate,
  eventReducer,
  initialEventState,
  mapEventRow,
  ownerDayWindowBounds,
} from "./events";
import type { BabyEvent, EventRow, EventType } from "../types/events";

const row: EventRow = {
  id: "event-1",
  user_id: "user-1",
  type: "feeding",
  occurred_at: "2026-08-21T12:30:00.000Z",
  notes: null,
  sleep_method: null,
  sleep_condition: null,
  sleep_room_temperature: null,
  feeding_type: "bottle",
  feeding_amount_ml: 120,
  feeding_duration_minutes: null,
  diaper_type: null,
  created_at: "2026-08-21T12:31:00.000Z",
  updated_at: "2026-08-21T12:31:00.000Z",
};

function event(id: string, type: EventType, occurredAt: string): BabyEvent {
  return mapEventRow({ ...row, id, type, occurred_at: occurredAt });
}

describe("mapEventRow", () => {
  it("maps database columns and nullable values", () => {
    const mapped = mapEventRow(row);

    expect(mapped.userId).toBe("user-1");
    expect(mapped.occurredAt).toEqual(new Date("2026-08-21T12:30:00.000Z"));
    expect(mapped.feedingType).toBe("bottle");
    expect(mapped.diaperType).toBeNull();
  });
});

describe("assertValidSleepSequence", () => {
  it("rejects consecutive phases of the same type", () => {
    const events = [event("sleep-1", "sleep", "2026-08-21T14:00:00.000Z")];

    expect(() => assertValidSleepSequence(events, "sleep")).toThrow("INVALID_SLEEP_SEQUENCE:sleep");
  });

  it("allows alternating phases and non-sleep events", () => {
    const events = [event("sleep-1", "sleep", "2026-08-21T14:00:00.000Z")];

    expect(() => assertValidSleepSequence(events, "wake_up")).not.toThrow();
    expect(() => assertValidSleepSequence(events, "feeding")).not.toThrow();
  });

  it("excludes the event being edited", () => {
    const events = [
      event("wake-2", "wake_up", "2026-08-21T15:00:00.000Z"),
      event("sleep-1", "sleep", "2026-08-21T14:00:00.000Z"),
    ];

    expect(() => assertValidSleepSequence(events, "wake_up", "wake-2")).not.toThrow();
  });
});

describe("eventReducer", () => {
  it("replaces stale rows with mutation results", () => {
    const stale = event("event-1", "feeding", "2026-08-21T14:00:00.000Z");
    const updated = { ...stale, occurredAt: new Date("2026-08-21T14:05:00.000Z") };
    const state = { ...initialEventState, events: [stale], loading: false, mutating: true };

    const next = eventReducer(state, { type: "upsert", event: updated });

    expect(next.events).toEqual([updated]);
    expect(next.mutating).toBe(false);
  });

  it("removes deleted rows immediately", () => {
    const existing = event("event-1", "diaper", "2026-08-21T14:00:00.000Z");
    const state = { ...initialEventState, events: [existing], loading: false, mutating: true };

    const next = eventReducer(state, { type: "remove", eventId: existing.id });

    expect(next.events).toEqual([]);
    expect(next.mutating).toBe(false);
  });

  it("replaces local data on a successful refresh", () => {
    const stale = event("event-1", "feeding", "2026-08-21T14:00:00.000Z");
    const fresh = { ...stale, occurredAt: new Date("2026-08-21T14:05:00.000Z") };
    const state = { ...initialEventState, events: [stale] };

    const next = eventReducer(state, { type: "load-success", events: [fresh] });

    expect(next.events).toEqual([fresh]);
  });

  it("ends an out-of-window mutation without changing visible rows", () => {
    const existing = event("event-1", "feeding", "2026-08-21T14:00:00.000Z");
    const state = { ...initialEventState, events: [existing], loading: false, mutating: true };

    const next = eventReducer(state, { type: "mutation-success" });

    expect(next.events).toEqual([existing]);
    expect(next.mutating).toBe(false);
  });
});

describe("day windows", () => {
  it("assigns pre-boundary events to the previous owner day", () => {
    const date = new Date(2026, 7, 21, 8, 30);

    expect(dayWindowDate(date, 12 * 60)).toEqual(new Date(2026, 7, 20));
    expect(dayWindowBounds(date, 12 * 60)).toEqual({
      start: new Date(2026, 7, 20, 12),
      end: new Date(2026, 7, 21, 12),
    });
  });

  it("builds bounds from an owner date without shifting it twice", () => {
    expect(ownerDayWindowBounds(new Date(2026, 7, 21), 12 * 60)).toEqual({
      start: new Date(2026, 7, 21, 12),
      end: new Date(2026, 7, 22, 12),
    });
  });
});
