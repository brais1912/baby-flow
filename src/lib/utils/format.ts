import { format, formatDuration, intervalToDuration } from "date-fns";
import type { EventType, DiaperType, SleepMethod } from "@/types/events";
import type { Event } from "@/lib/db/schema";

// Collapses breast_left + breast_right pairs at the same timestamp into a single
// synthetic "both_breasts" event, so "ambos pechos" counts as 1 feeding everywhere.
export function deduplicateBothBreasts(events: Event[]): Event[] {
  const result: Event[] = [];
  const usedIds = new Set<string>();

  for (const e of events) {
    if (usedIds.has(e.id)) continue;
    if (e.type === "feeding" && e.feedingType === "breast_left") {
      const pair = events.find(
        (o) => !usedIds.has(o.id) && o.id !== e.id &&
          o.type === "feeding" && o.feedingType === "breast_right" &&
          new Date(o.occurredAt).getTime() === new Date(e.occurredAt).getTime()
      );
      if (pair) {
        usedIds.add(e.id);
        usedIds.add(pair.id);
        result.push({ ...e, feedingType: "both_breasts" as never });
        continue;
      }
    }
    if (usedIds.has(e.id)) continue;
    result.push(e);
  }
  return result;
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatDateTime(date: Date): string {
  return format(date, "MMM d · HH:mm");
}

export function formatSleepDuration(start: Date, end: Date): string {
  const duration = intervalToDuration({ start, end });
  return formatDuration(duration, { format: ["hours", "minutes"] });
}

export function eventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    sleep: "Sleep",
    wake_up: "Wake up",
    feeding: "Feeding",
    diaper: "Diaper",
  };
  return labels[type];
}

export function diaperTypeLabel(type: DiaperType): string {
  const labels: Record<DiaperType, string> = {
    pee: "Pee",
    poop: "Poop",
    both: "Pee & Poop",
  };
  return labels[type];
}

export function sleepMethodLabel(method: SleepMethod): string {
  const labels: Record<SleepMethod, string> = {
    nursing: "While breastfeeding",
    bottle: "While drinking bottle",
    pacifier: "Pacifier",
    held: "Being held",
    rocking: "Rocking",
    self: "Self-soothing",
    other: "Other",
  };
  return labels[method];
}

// ── Week helpers ──────────────────────────────────────────────────────────────

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeekSunday(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function weeklyInsightsFetchRange(weekStart: Date): { start: Date; end: Date } {
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    start: new Date(weekStart.getTime() - 2 * dayMs),
    end: new Date(weekStart.getTime() + 9 * dayMs - 1),
  };
}

// ── Weekly insights aggregation ───────────────────────────────────────────────

export type SleepSession = { start: Date; end: Date; durationMs: number; isQuicklog: boolean };
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Mon=0 … Sun=6
export type DayWindowBounds = { start: Date; end: Date };

export const DEFAULT_DAY_WINDOW_START_MINUTES = 12 * 60;
export const ALLOWED_DAY_WINDOW_START_MINUTES = [
  0,
  8 * 60,
  9 * 60,
  10 * 60,
  11 * 60,
  DEFAULT_DAY_WINDOW_START_MINUTES,
  20 * 60,
  21 * 60,
  22 * 60,
  23 * 60,
] as const;

export function dayIndex(date: Date): DayIndex {
  const d = date.getDay(); // 0=Sun
  return (d === 0 ? 6 : d - 1) as DayIndex;
}

export function isValidDayWindowStartMinutes(value: number): boolean {
  return Number.isInteger(value) && ALLOWED_DAY_WINDOW_START_MINUTES.includes(value as (typeof ALLOWED_DAY_WINDOW_START_MINUTES)[number]);
}

function validDayWindowStartMinutes(value: number): number {
  return Number.isInteger(value) && value >= 0 && value < 24 * 60 ? value : DEFAULT_DAY_WINDOW_START_MINUTES;
}

function dayBoundaryOf(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(validDayWindowStartMinutes(dayWindowStartMinutes));
  return d;
}

function nextDayBoundary(after: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Date {
  const boundary = dayBoundaryOf(after, dayWindowStartMinutes);
  return after < boundary ? boundary : new Date(boundary.getTime() + 24 * 60 * 60 * 1000);
}

export function dayWindowDate(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Date {
  const d = new Date(date);
  if (d < dayBoundaryOf(date, dayWindowStartMinutes)) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayWindowBounds(ownerDate: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): DayWindowBounds {
  const start = dayBoundaryOf(ownerDate, dayWindowStartMinutes);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function dayWindowOffsetMinutes(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): number {
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
  return (minutes - validDayWindowStartMinutes(dayWindowStartMinutes) + 24 * 60) % (24 * 60);
}

export function dayWindowHourTicks(dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES, stepHours = 3): { offset: number; labelMinutes: number }[] {
  return Array.from({ length: Math.floor(24 / stepHours) + 1 }, (_, i) => {
    const offset = i * stepHours;
    return {
      offset,
      labelMinutes: (validDayWindowStartMinutes(dayWindowStartMinutes) + offset * 60) % (24 * 60),
    };
  });
}

export function formatHourLabel(minutes: number, suffix = ":00"): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}${suffix}`;
}

// Returns the calendar date (at midnight) of the noon-window that owns this datetime.
// Times before noon belong to the previous day's window.
export function noonWindowDate(date: Date): Date {
  return dayWindowDate(date);
}

function dayRowIndex(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): DayIndex {
  return dayIndex(dayWindowDate(date, dayWindowStartMinutes));
}

function sleepSessionDisplayDate(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Date {
  const ownerDate = dayWindowDate(date, dayWindowStartMinutes);
  if (validDayWindowStartMinutes(dayWindowStartMinutes) > 12 * 60) {
    const displayDate = new Date(ownerDate);
    displayDate.setDate(displayDate.getDate() + 1);
    return displayDate;
  }
  return ownerDate;
}

function sleepSessionRowIndex(date: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): DayIndex {
  return dayIndex(sleepSessionDisplayDate(date, dayWindowStartMinutes));
}

function weekOwnerEndDate(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 6);
  return d;
}

function dayWindowBelongsToWeek(date: Date, weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): boolean {
  const ownerDate = dayWindowDate(date, dayWindowStartMinutes);
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = weekOwnerEndDate(weekStart);
  return ownerDate >= start && ownerDate <= end;
}

function sleepSessionBelongsToWeek(date: Date, weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): boolean {
  const displayDate = sleepSessionDisplayDate(date, dayWindowStartMinutes);
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = weekOwnerEndDate(weekStart);
  return displayDate >= start && displayDate <= end;
}

export function buildWeeklySleepSessions(events: Event[], weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Record<DayIndex, SleepSession[]> {
  const weekEndOwnerDate = new Date(weekStart);
  weekEndOwnerDate.setDate(weekEndOwnerDate.getDate() + 7);
  const weekWindowEnd = dayWindowBounds(weekEndOwnerDate, dayWindowStartMinutes).start;
  const lookbackStart = new Date(dayWindowBounds(weekStart, dayWindowStartMinutes).start.getTime() - 24 * 60 * 60 * 1000);
  const sorted = [...events]
    .filter((e) => (e.type === "sleep" || e.type === "wake_up"))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const usedWakeIds = new Set<string>();
  const byDay: Record<DayIndex, SleepSession[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  sorted.filter((e) => e.type === "sleep").forEach((sleepEvent) => {
    const start = new Date(sleepEvent.occurredAt);
    if (start < lookbackStart || start >= weekWindowEnd) return;
    const wakeUp = sorted.find(
      (e) => e.type === "wake_up" && !usedWakeIds.has(e.id) && new Date(e.occurredAt) > start
    );
    const end = wakeUp ? new Date(wakeUp.occurredAt) : new Date(Math.min(start.getTime() + 60 * 60 * 1000, weekWindowEnd.getTime()));
    if (wakeUp) usedWakeIds.add(wakeUp.id);
    const isQuicklog = sleepEvent.notes === "QuickLog";

    let segStart = start;
    while (segStart < end) {
      const nextBoundary = nextDayBoundary(segStart, dayWindowStartMinutes);
      const segEnd = end < nextBoundary ? end : nextBoundary;

      if (sleepSessionBelongsToWeek(segStart, weekStart, dayWindowStartMinutes)) {
        const row = sleepSessionRowIndex(segStart, dayWindowStartMinutes);
        byDay[row].push({ start: segStart, end: segEnd, durationMs: segEnd.getTime() - segStart.getTime(), isQuicklog });
      }
      segStart = nextBoundary;
    }
  });

  return byDay;
}

export type WeekDayTotals = { sleepMs: number; feedings: number; diapers: number };

export function buildWeekDayTotals(events: Event[], weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): Record<DayIndex, WeekDayTotals> {
  const byDay: Record<DayIndex, WeekDayTotals> = { 0: { sleepMs: 0, feedings: 0, diapers: 0 }, 1: { sleepMs: 0, feedings: 0, diapers: 0 }, 2: { sleepMs: 0, feedings: 0, diapers: 0 }, 3: { sleepMs: 0, feedings: 0, diapers: 0 }, 4: { sleepMs: 0, feedings: 0, diapers: 0 }, 5: { sleepMs: 0, feedings: 0, diapers: 0 }, 6: { sleepMs: 0, feedings: 0, diapers: 0 } };

  const sleepSessions = buildWeeklySleepSessions(events, weekStart, dayWindowStartMinutes);
  (Object.entries(sleepSessions) as [string, SleepSession[]][]).forEach(([idx, sessions]) => {
    byDay[Number(idx) as DayIndex].sleepMs = sessions.reduce((s, r) => s + r.durationMs, 0);
  });

  const inWeek = events.filter((e) => dayWindowBelongsToWeek(new Date(e.occurredAt), weekStart, dayWindowStartMinutes));
  const feedingEvents = deduplicateBothBreasts(inWeek.filter((e) => e.type === "feeding"));
  feedingEvents.forEach((e) => { byDay[dayRowIndex(new Date(e.occurredAt), dayWindowStartMinutes)].feedings += 1; });
  inWeek.filter((e) => e.type === "diaper").forEach((e) => { byDay[dayRowIndex(new Date(e.occurredAt), dayWindowStartMinutes)].diapers += 1; });

  return byDay;
}

export type FeedingHeatmapCell = { dayIdx: DayIndex; hourBucket: number; count: number };

export function buildFeedingHeatmap(events: Event[], weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES, useWindowOffsetBuckets = false): FeedingHeatmapCell[] {
  const counts: Record<string, number> = {};
  const feedingEvents = deduplicateBothBreasts(
    events.filter((e) => e.type === "feeding" && dayWindowBelongsToWeek(new Date(e.occurredAt), weekStart, dayWindowStartMinutes))
  );
  feedingEvents.forEach((e) => {
    const d = new Date(e.occurredAt);
    const hourBucket = useWindowOffsetBuckets
      ? Math.floor(dayWindowOffsetMinutes(d, dayWindowStartMinutes) / 120)
      : Math.floor(d.getHours() / 2);
    const key = `${dayRowIndex(d, dayWindowStartMinutes)}-${hourBucket}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([key, count]) => {
    const [dayIdx, hourBucket] = key.split("-").map(Number);
    return { dayIdx: dayIdx as DayIndex, hourBucket, count };
  });
}

export type DiaperHeatmapCell = { dayIdx: DayIndex; hourBucket: number; count: number };

export function buildDiaperHeatmap(events: Event[], weekStart: Date, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES, useWindowOffsetBuckets = false): DiaperHeatmapCell[] {
  const counts: Record<string, number> = {};
  events
    .filter((e) => e.type === "diaper" && dayWindowBelongsToWeek(new Date(e.occurredAt), weekStart, dayWindowStartMinutes))
    .forEach((e) => {
      const d = new Date(e.occurredAt);
      const hourBucket = useWindowOffsetBuckets
        ? Math.floor(dayWindowOffsetMinutes(d, dayWindowStartMinutes) / 120)
        : Math.floor(d.getHours() / 2);
      const key = `${dayRowIndex(d, dayWindowStartMinutes)}-${hourBucket}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
  return Object.entries(counts).map(([key, count]) => {
    const [dayIdx, hourBucket] = key.split("-").map(Number);
    return { dayIdx: dayIdx as DayIndex, hourBucket, count };
  });
}

// ── Chart aggregation ─────────────────────────────────────────────────────────

export type SleepDayData = { label: string; date: Date; ms: number };

export function aggregateSleepByDay(events: Event[], now: Date, localeDateKeyFn: (d: Date) => string, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): SleepDayData[] {
  const sorted = [...events]
    .filter((e) => e.type === "sleep" || e.type === "wake_up")
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const usedWakeUpIds = new Set<string>();
  const byDay: Record<string, SleepDayData> = {};

  sorted.filter((e) => e.type === "sleep").forEach((sleepEvent) => {
    const start = new Date(sleepEvent.occurredAt);
    const wakeUp = sorted.find(
      (e) => e.type === "wake_up" && !usedWakeUpIds.has(e.id) && new Date(e.occurredAt) > start
    );
    const end = wakeUp ? new Date(wakeUp.occurredAt) : now;
    if (wakeUp) usedWakeUpIds.add(wakeUp.id);
    if (end <= start) return;

    let segStart = start;
    while (segStart < end) {
      const nextBoundary = nextDayBoundary(segStart, dayWindowStartMinutes);
      const segEnd = end < nextBoundary ? end : nextBoundary;
      const ownerDate = dayWindowDate(segStart, dayWindowStartMinutes);
      const key = localeDateKeyFn(ownerDate);

      if (!byDay[key]) byDay[key] = { label: key, date: ownerDate, ms: 0 };
      byDay[key].ms += segEnd.getTime() - segStart.getTime();
      segStart = nextBoundary;
    }
  });

  return Object.values(byDay).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type DiaperDayData = { label: string; date: Date; pee: number; poop: number; both: number };

export function aggregateDiaperByDay(events: Event[], localeDateKeyFn: (d: Date) => string, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): DiaperDayData[] {
  const byDay: Record<string, DiaperDayData> = {};
  events.filter((e) => e.type === "diaper").forEach((e) => {
    const ownerDate = dayWindowDate(new Date(e.occurredAt), dayWindowStartMinutes);
    const day = localeDateKeyFn(ownerDate);
    if (!byDay[day]) byDay[day] = { label: day, date: ownerDate, pee: 0, poop: 0, both: 0 };
    const key = (e.diaperType ?? "pee") as "pee" | "poop" | "both";
    byDay[day][key] += 1;
  });
  return Object.values(byDay).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type FeedingDayData = {
  label: string;
  date: Date;
  tomas: number;
  left: number;
  right: number;
  both: number;
  quicklog: number;
};

const BREAST_TYPES = new Set(["breast_left", "breast_right", "both_breasts"]);

export function aggregateBreastFeedingByDay(events: Event[], localeDateKeyFn: (d: Date) => string, dayWindowStartMinutes = DEFAULT_DAY_WINDOW_START_MINUTES): FeedingDayData[] {
  const breastEvents = deduplicateBothBreasts(
    events.filter((e) => e.type === "feeding" && (!e.feedingType || BREAST_TYPES.has(e.feedingType)))
  );
  const byDay: Record<string, FeedingDayData> = {};
  breastEvents.forEach((e) => {
    const ownerDate = dayWindowDate(new Date(e.occurredAt), dayWindowStartMinutes);
    const day = localeDateKeyFn(ownerDate);
    if (!byDay[day]) byDay[day] = { label: day, date: ownerDate, tomas: 0, left: 0, right: 0, both: 0, quicklog: 0 };
    byDay[day].tomas += 1;
    if (e.feedingType === "breast_left") byDay[day].left += 1;
    else if (e.feedingType === "breast_right") byDay[day].right += 1;
    else if (e.feedingType === "both_breasts") byDay[day].both += 1;
    else byDay[day].quicklog += 1;
  });
  return Object.values(byDay).sort((a, b) => a.date.getTime() - b.date.getTime());
}
