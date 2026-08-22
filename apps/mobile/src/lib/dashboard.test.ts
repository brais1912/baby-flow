import { describe, expect, it } from "vitest";
import type { BabyEvent, DiaperType, EventType, FeedingType } from "../types/events";
import {
  aggregateDiaperByDay,
  aggregateFeedingByDay,
  aggregateSleepByDay,
  buildTimeline,
  chartWindowBounds,
  countNightWakings,
  dashboardFetchBounds,
  eventsWithinOwnerDay,
} from "./dashboard";

function event(
  id: string,
  type: EventType,
  occurredAt: Date,
  details: { feedingType?: FeedingType; amount?: number; diaperType?: DiaperType } = {}
): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: details.feedingType ?? null,
    feedingAmountMl: details.amount ?? null,
    feedingDurationMinutes: null,
    diaperType: details.diaperType ?? null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("dashboard windows", () => {
  const owner = new Date(2026, 7, 21);

  it("uses exactly ten owner days and fetches one extra lookback day", () => {
    expect(chartWindowBounds(owner, 720)).toEqual({
      start: new Date(2026, 7, 12, 12),
      end: new Date(2026, 7, 22, 12),
    });
    expect(dashboardFetchBounds(owner, 720).start).toEqual(new Date(2026, 7, 11, 12));
  });

  it("includes the start and excludes the end of an owner day", () => {
    const events = [
      event("start", "feeding", new Date(2026, 7, 21, 12)),
      event("end", "feeding", new Date(2026, 7, 22, 12)),
    ];
    expect(eventsWithinOwnerDay(events, owner, 720).map(({ id }) => id)).toEqual(["start"]);
  });
});

describe("dashboard aggregations", () => {
  const owner = new Date(2026, 7, 21);

  it("splits sleep across configured day boundaries", () => {
    const data = aggregateSleepByDay([
      event("sleep", "sleep", new Date(2026, 7, 20, 11)),
      event("wake", "wake_up", new Date(2026, 7, 20, 13)),
    ], owner, 720, new Date(2026, 7, 21, 16));

    expect(data.slice(-2).map(({ hours }) => hours)).toEqual([1, 0]);
    expect(data.at(-3)?.hours).toBe(1);
  });

  it("caps an ongoing sleep at now", () => {
    const data = aggregateSleepByDay([
      event("sleep", "sleep", new Date(2026, 7, 21, 13)),
    ], owner, 720, new Date(2026, 7, 21, 15, 30));

    expect(data.at(-1)?.hours).toBe(2.5);
  });

  it("deduplicates paired breasts and handles missing feeding and diaper details", () => {
    const occurredAt = new Date(2026, 7, 21, 14);
    const feedings = aggregateFeedingByDay([
      event("left", "feeding", occurredAt, { feedingType: "breast_left" }),
      event("right", "feeding", occurredAt, { feedingType: "breast_right" }),
      event("quick", "feeding", new Date(2026, 7, 21, 15)),
      event("bottle", "feeding", new Date(2026, 7, 21, 16), { feedingType: "bottle", amount: 90 }),
    ], owner, 720);
    const diapers = aggregateDiaperByDay([
      event("unknown", "diaper", new Date(2026, 7, 21, 17)),
      event("both", "diaper", new Date(2026, 7, 21, 18), { diaperType: "both" }),
    ], owner, 720);

    expect(feedings.at(-1)).toMatchObject({ breastSessions: 2, bottleSessions: 1, bottleMl: 90 });
    expect(diapers.at(-1)).toMatchObject({ pee: 1, poop: 0, both: 1 });
  });

  it("does not count the final morning wake as a night waking", () => {
    const events = [
      event("wake-1", "wake_up", new Date(2026, 7, 21, 22)),
      event("wake-2", "wake_up", new Date(2026, 7, 22, 2)),
      event("wake-3", "wake_up", new Date(2026, 7, 22, 7)),
    ];
    expect(countNightWakings(events, owner)).toBe(2);
  });
});

describe("timeline", () => {
  it("clips sleep crossing the window and omits out-of-window points", () => {
    const owner = new Date(2026, 7, 21);
    const result = buildTimeline([
      event("sleep", "sleep", new Date(2026, 7, 21, 10)),
      event("wake", "wake_up", new Date(2026, 7, 21, 14)),
      event("feed", "feeding", new Date(2026, 7, 21, 13)),
      event("old-feed", "feeding", new Date(2026, 7, 21, 11)),
    ], owner, 720, new Date(2026, 7, 21, 16));

    expect(result.sleeps).toEqual([{ id: "sleep", start: new Date(2026, 7, 21, 12), end: new Date(2026, 7, 21, 14) }]);
    expect(result.points.map(({ id }) => id)).toEqual(["feed"]);
  });
});
