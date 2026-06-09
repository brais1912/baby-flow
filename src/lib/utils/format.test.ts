import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatDate,
  formatSleepDuration,
  eventTypeLabel,
  diaperTypeLabel,
  sleepMethodLabel,
  deduplicateBothBreasts,
  aggregateDiaperByDay,
  aggregateBreastFeedingByDay,
  buildWeeklySleepSessions,
} from "./format";
import type { Event } from "@/lib/db/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    type: "diaper",
    occurredAt: new Date("2024-01-15T10:00:00"),
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

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// ── formatTime ────────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formats time as HH:mm", () => {
    expect(formatTime(new Date("2024-01-15T08:30:00"))).toBe("08:30");
  });

  it("pads single-digit hours", () => {
    expect(formatTime(new Date("2024-01-15T03:05:00"))).toBe("03:05");
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats date as month day, year", () => {
    expect(formatDate(new Date("2024-01-15T00:00:00"))).toBe("Jan 15, 2024");
  });
});

// ── formatSleepDuration ───────────────────────────────────────────────────────

describe("formatSleepDuration", () => {
  it("returns formatted duration between two dates", () => {
    expect(formatSleepDuration(new Date("2024-01-15T20:00:00"), new Date("2024-01-16T02:30:00"))).toBe("6 hours 30 minutes");
  });

  it("handles exactly 1 hour", () => {
    expect(formatSleepDuration(new Date("2024-01-15T20:00:00"), new Date("2024-01-15T21:00:00"))).toBe("1 hour");
  });
});

// ── eventTypeLabel ────────────────────────────────────────────────────────────

describe("eventTypeLabel", () => {
  it("returns correct label for each event type", () => {
    expect(eventTypeLabel("sleep")).toBe("Sleep");
    expect(eventTypeLabel("feeding")).toBe("Feeding");
    expect(eventTypeLabel("diaper")).toBe("Diaper");
  });
});

// ── diaperTypeLabel ───────────────────────────────────────────────────────────

describe("diaperTypeLabel", () => {
  it("returns correct label for each diaper type", () => {
    expect(diaperTypeLabel("pee")).toBe("Pee");
    expect(diaperTypeLabel("poop")).toBe("Poop");
    expect(diaperTypeLabel("both")).toBe("Pee & Poop");
  });
});

// ── sleepMethodLabel ──────────────────────────────────────────────────────────

describe("sleepMethodLabel", () => {
  it("returns correct label for each sleep method", () => {
    expect(sleepMethodLabel("pacifier")).toBe("Pacifier");
    expect(sleepMethodLabel("held")).toBe("Being held");
    expect(sleepMethodLabel("self")).toBe("Self-soothing");
  });
});

// ── deduplicateBothBreasts ────────────────────────────────────────────────────

describe("deduplicateBothBreasts", () => {
  it("merges breast_left + breast_right at same timestamp into both_breasts", () => {
    const ts = new Date("2024-01-15T10:00:00");
    const events = [
      makeEvent({ id: "a", type: "feeding", feedingType: "breast_left",  occurredAt: ts }),
      makeEvent({ id: "b", type: "feeding", feedingType: "breast_right", occurredAt: ts }),
    ];
    const result = deduplicateBothBreasts(events);
    expect(result).toHaveLength(1);
    expect(result[0].feedingType).toBe("both_breasts");
  });

  it("leaves unpaired breast_left as-is", () => {
    const events = [makeEvent({ type: "feeding", feedingType: "breast_left" })];
    expect(deduplicateBothBreasts(events)).toHaveLength(1);
    expect(deduplicateBothBreasts(events)[0].feedingType).toBe("breast_left");
  });

  it("does not merge breasts at different timestamps", () => {
    const events = [
      makeEvent({ id: "a", type: "feeding", feedingType: "breast_left",  occurredAt: new Date("2024-01-15T10:00:00") }),
      makeEvent({ id: "b", type: "feeding", feedingType: "breast_right", occurredAt: new Date("2024-01-15T10:01:00") }),
    ];
    expect(deduplicateBothBreasts(events)).toHaveLength(2);
  });
});

// ── aggregateDiaperByDay ──────────────────────────────────────────────────────

describe("aggregateDiaperByDay", () => {
  it("counts pee, poop, both separately per day", () => {
    const events = [
      makeEvent({ type: "diaper", diaperType: "pee",  occurredAt: new Date("2024-01-15T08:00:00") }),
      makeEvent({ type: "diaper", diaperType: "poop", occurredAt: new Date("2024-01-15T12:00:00") }),
      makeEvent({ type: "diaper", diaperType: "both", occurredAt: new Date("2024-01-15T18:00:00") }),
    ];
    const result = aggregateDiaperByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ pee: 1, poop: 1, both: 1 });
  });

  it("counts QuickLog events (null diaperType) as pee", () => {
    const events = [
      makeEvent({ type: "diaper", diaperType: null, notes: "QuickLog" }),
      makeEvent({ type: "diaper", diaperType: null, notes: "QuickLog" }),
    ];
    const result = aggregateDiaperByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0].pee).toBe(2);
  });

  it("splits events across different days into separate bars", () => {
    const events = [
      makeEvent({ type: "diaper", diaperType: "pee", occurredAt: new Date("2024-01-14T10:00:00") }),
      makeEvent({ type: "diaper", diaperType: "pee", occurredAt: new Date("2024-01-15T10:00:00") }),
    ];
    const result = aggregateDiaperByDay(events, dayKey);
    expect(result).toHaveLength(2);
    expect(result[0].pee).toBe(1);
    expect(result[1].pee).toBe(1);
  });

  it("ignores non-diaper events", () => {
    const events = [
      makeEvent({ type: "feeding", feedingType: "bottle" }),
      makeEvent({ type: "diaper", diaperType: "pee" }),
    ];
    const result = aggregateDiaperByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0].pee).toBe(1);
  });

  it("returns empty array when there are no diaper events", () => {
    expect(aggregateDiaperByDay([], dayKey)).toHaveLength(0);
  });
});

// ── buildWeeklySleepSessions ──────────────────────────────────────────────────

describe("buildWeeklySleepSessions", () => {
  // Week: Mon 2024-01-15 … Sun 2024-01-21
  const weekStart = new Date("2024-01-15T00:00:00");

  it("assigns a normal same-day sleep to the correct day row", () => {
    const events = [
      makeEvent({ id: "s1", type: "sleep",   occurredAt: new Date("2024-01-15T20:00:00") }),
      makeEvent({ id: "w1", type: "wake_up", occurredAt: new Date("2024-01-15T22:00:00") }),
    ];
    const sessions = buildWeeklySleepSessions(events, weekStart);
    expect(sessions[0]).toHaveLength(1); // Monday
    expect(sessions[0][0].start).toEqual(new Date("2024-01-15T20:00:00"));
    expect(sessions[0][0].end).toEqual(new Date("2024-01-15T22:00:00"));
  });

  it("splits an overnight sleep into two segments at noon boundary", () => {
    // Sleep Mon 22:00 → Tue 04:00 — should produce segment on Mon row AND Tue row
    const events = [
      makeEvent({ id: "s1", type: "sleep",   occurredAt: new Date("2024-01-15T22:00:00") }),
      makeEvent({ id: "w1", type: "wake_up", occurredAt: new Date("2024-01-16T04:00:00") }),
    ];
    const sessions = buildWeeklySleepSessions(events, weekStart);
    // Mon row (idx 0): 22:00 → midnight(noon next day doesn't apply — actually splits at noon)
    // The split point is noon of 2024-01-16. Both 22:00 Mon and 04:00 Tue are before next noon (Jan 16 noon).
    // So there is NO noon crossing — both times are in the Mon noon-window (Mon 12:00 → Tue 12:00).
    expect(sessions[0]).toHaveLength(1);
    expect(sessions[0][0].start).toEqual(new Date("2024-01-15T22:00:00"));
    expect(sessions[0][0].end).toEqual(new Date("2024-01-16T04:00:00"));
    // Tue row should be empty
    expect(sessions[1]).toHaveLength(0);
  });

  it("shows an overnight sleep that starts the day before the week on the correct Sunday row", () => {
    // Sleep Sun 22:00 → Mon 04:00. With noon→noon windows, the Sunday row covers Sun 12:00→Mon 12:00,
    // so 04:00 Mon is still within Sunday's row (idx 6).
    const events = [
      makeEvent({ id: "s1", type: "sleep",   occurredAt: new Date("2024-01-14T22:00:00") }),
      makeEvent({ id: "w1", type: "wake_up", occurredAt: new Date("2024-01-15T04:00:00") }),
    ];
    const sessions = buildWeeklySleepSessions(events, weekStart);
    // Sun row (idx 6) should contain the carryover segment
    expect(sessions[6]).toHaveLength(1);
    expect(sessions[6][0].end).toEqual(new Date("2024-01-15T04:00:00"));
  });

  it("splits a session that crosses noon into two rows", () => {
    // Sleep Mon 11:00 → Mon 13:00 — crosses noon, so Mon row gets 11:00→12:00 and Mon+1 row? No:
    // Mon row window is Mon 12:00→Tue 12:00. 11:00 Mon is BEFORE noon, so it belongs to Sun row (idx 6).
    // Segment 1: Sun row, 11:00→12:00. Segment 2: Mon row, 12:00→13:00.
    const events = [
      makeEvent({ id: "s1", type: "sleep",   occurredAt: new Date("2024-01-15T11:00:00") }),
      makeEvent({ id: "w1", type: "wake_up", occurredAt: new Date("2024-01-15T13:00:00") }),
    ];
    const sessions = buildWeeklySleepSessions(events, weekStart);
    // Sun row (idx 6): 11:00 → 12:00
    expect(sessions[6]).toHaveLength(1);
    expect(sessions[6][0].start).toEqual(new Date("2024-01-15T11:00:00"));
    expect(sessions[6][0].end).toEqual(new Date("2024-01-15T12:00:00"));
    // Mon row (idx 0): 12:00 → 13:00
    expect(sessions[0]).toHaveLength(1);
    expect(sessions[0][0].start).toEqual(new Date("2024-01-15T12:00:00"));
    expect(sessions[0][0].end).toEqual(new Date("2024-01-15T13:00:00"));
  });
});

// ── aggregateBreastFeedingByDay ───────────────────────────────────────────────

describe("aggregateBreastFeedingByDay", () => {
  it("counts breast feeding sessions per day", () => {
    const events = [
      makeEvent({ type: "feeding", feedingType: "breast_left",  occurredAt: new Date("2024-01-15T08:00:00") }),
      makeEvent({ type: "feeding", feedingType: "breast_right", occurredAt: new Date("2024-01-15T12:00:00") }),
    ];
    const result = aggregateBreastFeedingByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0].tomas).toBe(2);
  });

  it("counts QuickLog feeding events (null feedingType) as breast sessions", () => {
    const events = [
      makeEvent({ type: "feeding", feedingType: null, notes: "QuickLog" }),
      makeEvent({ type: "feeding", feedingType: null, notes: "QuickLog" }),
    ];
    const result = aggregateBreastFeedingByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0].tomas).toBe(2);
  });

  it("excludes bottle and formula feedings", () => {
    const events = [
      makeEvent({ type: "feeding", feedingType: "bottle" }),
      makeEvent({ type: "feeding", feedingType: "formula" }),
      makeEvent({ type: "feeding", feedingType: "breast_left" }),
    ];
    const result = aggregateBreastFeedingByDay(events, dayKey);
    expect(result).toHaveLength(1);
    expect(result[0].tomas).toBe(1);
  });

  it("merges breast_left + breast_right at same timestamp into 1 session", () => {
    const ts = new Date("2024-01-15T10:00:00");
    const events = [
      makeEvent({ id: "a", type: "feeding", feedingType: "breast_left",  occurredAt: ts }),
      makeEvent({ id: "b", type: "feeding", feedingType: "breast_right", occurredAt: ts }),
    ];
    const result = aggregateBreastFeedingByDay(events, dayKey);
    expect(result[0].tomas).toBe(1);
  });

  it("returns empty array when there are no breast feeding events", () => {
    const events = [makeEvent({ type: "feeding", feedingType: "bottle" })];
    expect(aggregateBreastFeedingByDay(events, dayKey)).toHaveLength(0);
  });
});
