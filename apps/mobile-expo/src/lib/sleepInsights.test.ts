import { describe, expect, it } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import {
  buildDailySleepSummary,
  buildSleepHistory,
  compareTotalSleepWithGuidance,
  ownerDateFromKey,
  ownerDateKey,
  pairSleepEvents,
  sleepReferencesForAge,
  splitSleepAtDayNightBoundaries,
} from "./sleepInsights";

function event(id: string, type: EventType, occurredAt: Date): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: "QuickLog",
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

describe("sleep insights", () => {
  it("pairs alternating sleep phases and exposes unmatched events", () => {
    const result = pairSleepEvents([
      event("wake-orphan", "wake_up", new Date(2026, 7, 23, 8)),
      event("sleep-1", "sleep", new Date(2026, 7, 23, 10)),
      event("wake-1", "wake_up", new Date(2026, 7, 23, 11, 30)),
      event("sleep-2", "sleep", new Date(2026, 7, 23, 13)),
    ]);

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({ durationMinutes: 90 });
    expect(result.unmatched.map(({ id }) => id)).toEqual(["wake-orphan", "sleep-2"]);
  });

  it("splits completed sleep at the 20:00 and 10:00 definitions", () => {
    expect(splitSleepAtDayNightBoundaries(
      new Date(2026, 7, 23, 19),
      new Date(2026, 7, 24, 11)
    )).toEqual({ daytimeMinutes: 120, nighttimeMinutes: 14 * 60 });
  });

  it("classifies completed-session averages by the sleep event at the exact clock boundaries", () => {
    const ownerDate = new Date(2026, 7, 23);
    const summary = buildDailySleepSummary({
      ownerDate,
      startMinutes: 0,
      dateOfBirth: "2026-02-23",
      events: [
        event("day-sleep", "sleep", new Date(2026, 7, 23, 10)),
        event("day-wake", "wake_up", new Date(2026, 7, 23, 11)),
        event("night-sleep", "sleep", new Date(2026, 7, 23, 20)),
        event("night-wake", "wake_up", new Date(2026, 7, 23, 22)),
      ],
    });

    expect(summary).toMatchObject({
      daytimeSessionCount: 1,
      daytimeAverageMinutes: 60,
      nighttimeSessionCount: 1,
      nighttimeAverageMinutes: 120,
    });
  });

  it("calculates totals, averages, night wakings, and incomplete data without fabricating durations", () => {
    const ownerDate = new Date(2026, 7, 23);
    const events = [
      event("sleep-day", "sleep", new Date(2026, 7, 23, 14)),
      event("wake-day", "wake_up", new Date(2026, 7, 23, 15)),
      event("sleep-night", "sleep", new Date(2026, 7, 23, 21)),
      event("wake-night-1", "wake_up", new Date(2026, 7, 24, 1)),
      event("sleep-night-2", "sleep", new Date(2026, 7, 24, 2)),
      event("wake-night-2", "wake_up", new Date(2026, 7, 24, 7)),
      event("sleep-incomplete", "sleep", new Date(2026, 7, 24, 11)),
    ];
    const summary = buildDailySleepSummary({
      events,
      ownerDate,
      startMinutes: 12 * 60,
      dateOfBirth: "2026-02-23",
    });

    expect(summary).toMatchObject({
      totalSleepMinutes: 10 * 60,
      daytimeSleepMinutes: 60,
      nighttimeSleepMinutes: 9 * 60,
      daytimeSessionCount: 1,
      nighttimeSessionCount: 2,
      daytimeAverageMinutes: 60,
      nighttimeAverageMinutes: 270,
      nightWakings: 1,
      longestSleepMinutes: 5 * 60,
      completePairCount: 3,
      excludedUnmatchedCount: 1,
      ageMonthsAtWindowEnd: 6,
    });
  });

  it("uses historical owner-day age for source-compatible total-sleep references", () => {
    const history = buildSleepHistory({
      events: [],
      latestOwnerDate: new Date(2026, 7, 23),
      startMinutes: 720,
      dateOfBirth: "2026-05-24",
      dayCount: 2,
    });
    const [latest, previous] = history;
    if (!latest || !previous) throw new Error("Expected two history days");

    expect(latest.ageMonthsAtWindowEnd).toBe(3);
    expect(latest.references.map(({ source }) => source)).toEqual(["who"]);
    expect(previous.ageMonthsAtWindowEnd).toBe(2);
    expect(sleepReferencesForAge(4).map(({ source }) => source)).toEqual(["who", "aasm"]);
    expect(sleepReferencesForAge(72)).toEqual([]);
  });

  it("classifies recorded total sleep against an age-compatible recommendation", () => {
    const reference = sleepReferencesForAge(6)[0];
    if (!reference) throw new Error("Expected a six-month sleep reference");
    const comparison = (totalSleepMinutes: number, completePairCount = 1) => compareTotalSleepWithGuidance({
      totalSleepMinutes,
      completePairCount,
      references: [reference],
    });

    expect(comparison(12 * 60).status).toBe("within");
    expect(comparison(16 * 60).status).toBe("within");
    expect(comparison(12 * 60 - 1).status).toBe("below");
    expect(comparison(16 * 60 + 1).status).toBe("above");
    expect(compareTotalSleepWithGuidance({ totalSleepMinutes: 0, completePairCount: 0, references: [reference] })).toEqual({
      status: "insufficient-data",
      reference: null,
    });
    expect(compareTotalSleepWithGuidance({ totalSleepMinutes: 12 * 60, completePairCount: 1, references: [] })).toEqual({
      status: "unavailable",
      reference: null,
    });
  });

  it("round-trips owner dates without UTC conversion", () => {
    const date = new Date(2026, 7, 24);
    expect(ownerDateKey(date)).toBe("2026-08-24");
    expect(ownerDateFromKey("2026-08-24")).toEqual(date);
    expect(ownerDateFromKey("2026-02-30")).toBeNull();
  });
});
