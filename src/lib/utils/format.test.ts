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
