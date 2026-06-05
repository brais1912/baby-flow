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

// ── Chart aggregation ─────────────────────────────────────────────────────────

export type DiaperDayData = { label: string; date: Date; pee: number; poop: number; both: number };

export function aggregateDiaperByDay(events: Event[], localeDateKeyFn: (d: Date) => string): DiaperDayData[] {
  const byDay: Record<string, DiaperDayData> = {};
  events.filter((e) => e.type === "diaper").forEach((e) => {
    const d = new Date(e.occurredAt);
    const day = localeDateKeyFn(d);
    if (!byDay[day]) byDay[day] = { label: day, date: d, pee: 0, poop: 0, both: 0 };
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
    const d = new Date(e.occurredAt);
    const day = localeDateKeyFn(d);
    if (!byDay[day]) byDay[day] = { label: day, date: d, tomas: 0, left: 0, right: 0, both: 0, quicklog: 0 };
    byDay[day].tomas += 1;
    if (e.feedingType === "breast_left") byDay[day].left += 1;
    else if (e.feedingType === "breast_right") byDay[day].right += 1;
    else if (e.feedingType === "both_breasts") byDay[day].both += 1;
    else byDay[day].quicklog += 1;
  });
  return Object.values(byDay).sort((a, b) => a.date.getTime() - b.date.getTime());
}
