import type { BabyEvent } from "../types/events";
import { dayWindowDate, ownerDayWindowBounds } from "./events";

const DAY_MS = 24 * 60 * 60 * 1000;
export const CHART_DAY_COUNT = 10;

export type SleepDay = { date: Date; hours: number };
export type FeedingDay = { date: Date; breastSessions: number; bottleSessions: number; bottleMl: number };
export type DiaperDay = { date: Date; pee: number; poop: number; both: number };
export type TimelineSleep = { id: string; start: Date; end: Date; wakeId: string | null };
export type TimelinePoint = { id: string; type: "feeding" | "diaper"; occurredAt: Date };

function shiftDay(date: Date, amount: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  shifted.setHours(0, 0, 0, 0);
  return shifted;
}

export function chartWindowBounds(ownerDate: Date, startMinutes: number) {
  return {
    start: ownerDayWindowBounds(shiftDay(ownerDate, -(CHART_DAY_COUNT - 1)), startMinutes).start,
    end: ownerDayWindowBounds(ownerDate, startMinutes).end,
  };
}

export function dashboardFetchBounds(ownerDate: Date, startMinutes: number) {
  const chart = chartWindowBounds(ownerDate, startMinutes);
  return { start: new Date(chart.start.getTime() - DAY_MS), end: chart.end };
}

export function eventsWithinOwnerDay(events: BabyEvent[], ownerDate: Date, startMinutes: number): BabyEvent[] {
  const { start, end } = ownerDayWindowBounds(ownerDate, startMinutes);
  return events.filter((event) => event.occurredAt >= start && event.occurredAt < end);
}

export function eventsWithinChartWindow(events: BabyEvent[], ownerDate: Date, startMinutes: number): BabyEvent[] {
  const { start, end } = chartWindowBounds(ownerDate, startMinutes);
  return events.filter((event) => event.occurredAt >= start && event.occurredAt < end);
}

export function isTodayOwner(ownerDate: Date, startMinutes: number, now = new Date()): boolean {
  return ownerDate.getTime() === dayWindowDate(now, startMinutes).getTime();
}

export function adjacentOwnerDay(ownerDate: Date, offset: -1 | 1): Date {
  return shiftDay(ownerDate, offset);
}

export function getAwakeState(events: BabyEvent[], now = new Date()) {
  const latest = events
    .filter((event) =>
      (event.type === "sleep" || event.type === "wake_up") && event.occurredAt <= now
    )
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];

  if (!latest) return null;
  return {
    isAwake: latest.type === "wake_up",
    since: latest.occurredAt,
    durationMs: Math.max(0, now.getTime() - latest.occurredAt.getTime()),
  };
}

export function countNightWakings(events: BabyEvent[], ownerDate: Date): number {
  const start = new Date(ownerDate);
  start.setHours(20, 0, 0, 0);
  const end = shiftDay(ownerDate, 1);
  end.setHours(10, 0, 0, 0);
  const wakeUps = events.filter(
    (event) => event.type === "wake_up" && event.occurredAt >= start && event.occurredAt < end
  );
  return Math.max(0, wakeUps.length - 1);
}

function emptyOwnerDays<T>(ownerDate: Date, create: (date: Date) => T): T[] {
  return Array.from({ length: CHART_DAY_COUNT }, (_, index) =>
    create(shiftDay(ownerDate, index - (CHART_DAY_COUNT - 1)))
  );
}

export function aggregateSleepByDay(
  events: BabyEvent[],
  ownerDate: Date,
  startMinutes: number,
  now = new Date()
): SleepDay[] {
  const days = emptyOwnerDays(ownerDate, (date) => ({ date, hours: 0 }));
  const byOwner = new Map(days.map((day) => [day.date.getTime(), day]));
  const phases = events
    .filter((event) => event.type === "sleep" || event.type === "wake_up")
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const usedWakeIds = new Set<string>();

  for (const sleep of phases.filter((event) => event.type === "sleep")) {
    const wake = phases.find(
      (event) => event.type === "wake_up" && !usedWakeIds.has(event.id) && event.occurredAt > sleep.occurredAt
    );
    const sessionEnd = wake?.occurredAt ?? now;
    if (wake) usedWakeIds.add(wake.id);
    if (sessionEnd <= sleep.occurredAt) continue;

    let segmentStart = sleep.occurredAt;
    while (segmentStart < sessionEnd) {
      const segmentOwner = dayWindowDate(segmentStart, startMinutes);
      const nextBoundary = ownerDayWindowBounds(segmentOwner, startMinutes).end;
      const segmentEnd = sessionEnd < nextBoundary ? sessionEnd : nextBoundary;
      const day = byOwner.get(segmentOwner.getTime());
      if (day) day.hours += (segmentEnd.getTime() - segmentStart.getTime()) / 3_600_000;
      segmentStart = segmentEnd;
    }
  }

  return days.map((day) => ({ ...day, hours: Math.round(day.hours * 10) / 10 }));
}

export function deduplicateBothBreasts(events: BabyEvent[]): BabyEvent[] {
  const result: BabyEvent[] = [];
  const used = new Set<string>();
  for (const event of events) {
    if (used.has(event.id)) continue;
    if (event.feedingType === "breast_left") {
      const pair = events.find(
        (candidate) =>
          !used.has(candidate.id) &&
          candidate.id !== event.id &&
          candidate.feedingType === "breast_right" &&
          candidate.occurredAt.getTime() === event.occurredAt.getTime()
      );
      if (pair) {
        used.add(event.id);
        used.add(pair.id);
        result.push({ ...event, feedingType: "both_breasts" });
        continue;
      }
    }
    result.push(event);
  }
  return result;
}

export function aggregateFeedingByDay(events: BabyEvent[], ownerDate: Date, startMinutes: number): FeedingDay[] {
  const days = emptyOwnerDays(ownerDate, (date) => ({ date, breastSessions: 0, bottleSessions: 0, bottleMl: 0 }));
  const byOwner = new Map(days.map((day) => [day.date.getTime(), day]));
  const feedings = deduplicateBothBreasts(events.filter((event) => event.type === "feeding"));

  for (const feeding of feedings) {
    const day = byOwner.get(dayWindowDate(feeding.occurredAt, startMinutes).getTime());
    if (!day) continue;
    if (feeding.feedingType === "bottle" || feeding.feedingType === "formula" || feeding.feedingType === "solid") {
      day.bottleSessions += 1;
      day.bottleMl += feeding.feedingAmountMl ?? 0;
    } else {
      day.breastSessions += 1;
    }
  }
  return days;
}

export function aggregateDiaperByDay(events: BabyEvent[], ownerDate: Date, startMinutes: number): DiaperDay[] {
  const days = emptyOwnerDays(ownerDate, (date) => ({ date, pee: 0, poop: 0, both: 0 }));
  const byOwner = new Map(days.map((day) => [day.date.getTime(), day]));

  for (const event of events.filter((candidate) => candidate.type === "diaper")) {
    const day = byOwner.get(dayWindowDate(event.occurredAt, startMinutes).getTime());
    if (!day) continue;
    day[event.diaperType ?? "pee"] += 1;
  }
  return days;
}

export function buildTimeline(
  events: BabyEvent[],
  ownerDate: Date,
  startMinutes: number,
  now = new Date()
): { sleeps: TimelineSleep[]; points: TimelinePoint[] } {
  const { start, end } = ownerDayWindowBounds(ownerDate, startMinutes);
  const sorted = [...events].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const phases = sorted.filter((event) => event.type === "sleep" || event.type === "wake_up");
  const usedWakeIds = new Set<string>();
  const sleeps: TimelineSleep[] = [];

  for (const sleep of phases.filter((event) => event.type === "sleep")) {
    const wake = phases.find(
      (event) => event.type === "wake_up" && !usedWakeIds.has(event.id) && event.occurredAt > sleep.occurredAt
    );
    if (wake) usedWakeIds.add(wake.id);
    const sessionEnd = wake?.occurredAt ?? now;
    const clippedStart = sleep.occurredAt > start ? sleep.occurredAt : start;
    const clippedEnd = sessionEnd < end ? sessionEnd : end;
    if (clippedStart < clippedEnd) sleeps.push({
      id: sleep.id,
      start: clippedStart,
      end: clippedEnd,
      wakeId: wake?.id ?? null,
    });
  }

  const points = sorted
    .filter(
      (event): event is BabyEvent & { type: "feeding" | "diaper" } =>
        (event.type === "feeding" || event.type === "diaper") && event.occurredAt >= start && event.occurredAt < end
    )
    .map((event) => ({ id: event.id, type: event.type, occurredAt: event.occurredAt }));

  return { sleeps, points };
}

export function dayWindowOffsetRatio(date: Date, startMinutes: number): number {
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  return ((minutes - startMinutes + 24 * 60) % (24 * 60)) / (24 * 60);
}
