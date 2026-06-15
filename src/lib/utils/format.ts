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

// ── Weekly insights aggregation ───────────────────────────────────────────────

export type SleepSession = { start: Date; end: Date; durationMs: number; isQuicklog: boolean };
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Mon=0 … Sun=6

export function dayIndex(date: Date): DayIndex {
  const d = date.getDay(); // 0=Sun
  return (d === 0 ? 6 : d - 1) as DayIndex;
}

// Returns noon (12:00:00) of the given date
function noonOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

// Returns the calendar date (at midnight) of the noon-window that owns this datetime.
// Times before noon belong to the previous day's window.
export function noonWindowDate(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns which day row (Mon=0…Sun=6) owns the noon-to-noon window containing this date.
// The window for day D runs from noon(D) to noon(D+1), so times before noon belong to the previous day's row.
function dayRowIndex(date: Date): DayIndex {
  return dayIndex(noonWindowDate(date));
}

function weekOwnerEndDate(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 6);
  return d;
}

function noonWindowBelongsToWeek(date: Date, weekStart: Date): boolean {
  const ownerDate = noonWindowDate(date);
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = weekOwnerEndDate(weekStart);
  return ownerDate >= start && ownerDate <= end;
}

export function buildWeeklySleepSessions(events: Event[], weekStart: Date): Record<DayIndex, SleepSession[]> {
  const weekWindowEnd = new Date(weekStart);
  weekWindowEnd.setDate(weekWindowEnd.getDate() + 7);
  weekWindowEnd.setHours(12, 0, 0, 0);
  // Look back up to 24h before the week to catch overnight sleeps that cross noon into Monday
  const lookbackStart = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);
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

    // Split at every noon boundary the session crosses
    let segStart = start;
    while (segStart < end) {
      const segNoon = noonOf(segStart);
      // Next noon: if segStart is before noon today use today's noon, otherwise tomorrow's noon
      const nextNoon = segStart < segNoon ? segNoon : new Date(segNoon.getTime() + 24 * 60 * 60 * 1000);
      const segEnd = end < nextNoon ? end : nextNoon;

      if (noonWindowBelongsToWeek(segStart, weekStart)) {
        const row = dayRowIndex(segStart);
        byDay[row].push({ start: segStart, end: segEnd, durationMs: segEnd.getTime() - segStart.getTime(), isQuicklog });
      }
      segStart = nextNoon;
    }
  });

  return byDay;
}

export type WeekDayTotals = { sleepMs: number; feedings: number; diapers: number };

export function buildWeekDayTotals(events: Event[], weekStart: Date): Record<DayIndex, WeekDayTotals> {
  const byDay: Record<DayIndex, WeekDayTotals> = { 0: { sleepMs: 0, feedings: 0, diapers: 0 }, 1: { sleepMs: 0, feedings: 0, diapers: 0 }, 2: { sleepMs: 0, feedings: 0, diapers: 0 }, 3: { sleepMs: 0, feedings: 0, diapers: 0 }, 4: { sleepMs: 0, feedings: 0, diapers: 0 }, 5: { sleepMs: 0, feedings: 0, diapers: 0 }, 6: { sleepMs: 0, feedings: 0, diapers: 0 } };

  const sleepSessions = buildWeeklySleepSessions(events, weekStart);
  (Object.entries(sleepSessions) as [string, SleepSession[]][]).forEach(([idx, sessions]) => {
    byDay[Number(idx) as DayIndex].sleepMs = sessions.reduce((s, r) => s + r.durationMs, 0);
  });

  const inWeek = events.filter((e) => noonWindowBelongsToWeek(new Date(e.occurredAt), weekStart));
  const feedingEvents = deduplicateBothBreasts(inWeek.filter((e) => e.type === "feeding"));
  feedingEvents.forEach((e) => { byDay[dayRowIndex(new Date(e.occurredAt))].feedings += 1; });
  inWeek.filter((e) => e.type === "diaper").forEach((e) => { byDay[dayRowIndex(new Date(e.occurredAt))].diapers += 1; });

  return byDay;
}

export type FeedingHeatmapCell = { dayIdx: DayIndex; hourBucket: number; count: number };

export function buildFeedingHeatmap(events: Event[], weekStart: Date): FeedingHeatmapCell[] {
  const counts: Record<string, number> = {};
  const feedingEvents = deduplicateBothBreasts(
    events.filter((e) => e.type === "feeding" && noonWindowBelongsToWeek(new Date(e.occurredAt), weekStart))
  );
  feedingEvents.forEach((e) => {
    const d = new Date(e.occurredAt);
    const key = `${dayRowIndex(d)}-${Math.floor(d.getHours() / 2)}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([key, count]) => {
    const [dayIdx, hourBucket] = key.split("-").map(Number);
    return { dayIdx: dayIdx as DayIndex, hourBucket, count };
  });
}

export type DiaperHeatmapCell = { dayIdx: DayIndex; hourBucket: number; count: number };

export function buildDiaperHeatmap(events: Event[], weekStart: Date): DiaperHeatmapCell[] {
  const counts: Record<string, number> = {};
  events
    .filter((e) => e.type === "diaper" && noonWindowBelongsToWeek(new Date(e.occurredAt), weekStart))
    .forEach((e) => {
      const d = new Date(e.occurredAt);
      const key = `${dayRowIndex(d)}-${Math.floor(d.getHours() / 2)}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
  return Object.entries(counts).map(([key, count]) => {
    const [dayIdx, hourBucket] = key.split("-").map(Number);
    return { dayIdx: dayIdx as DayIndex, hourBucket, count };
  });
}

// ── Chart aggregation ─────────────────────────────────────────────────────────

export type DiaperDayData = { label: string; date: Date; pee: number; poop: number; both: number };

export function aggregateDiaperByDay(events: Event[], localeDateKeyFn: (d: Date) => string): DiaperDayData[] {
  const byDay: Record<string, DiaperDayData> = {};
  events.filter((e) => e.type === "diaper").forEach((e) => {
    const ownerDate = noonWindowDate(new Date(e.occurredAt));
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

export function aggregateBreastFeedingByDay(events: Event[], localeDateKeyFn: (d: Date) => string): FeedingDayData[] {
  const breastEvents = deduplicateBothBreasts(
    events.filter((e) => e.type === "feeding" && (!e.feedingType || BREAST_TYPES.has(e.feedingType)))
  );
  const byDay: Record<string, FeedingDayData> = {};
  breastEvents.forEach((e) => {
    const ownerDate = noonWindowDate(new Date(e.occurredAt));
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
