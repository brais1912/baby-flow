import type { BabyEvent } from "../types/events";
import { countNightWakings } from "./dashboard";
import { dayWindowDate, ownerDayWindowBounds } from "./events";
import { completedAgeMonths } from "./profile";

const MINUTE_MS = 60_000;

export const SLEEP_REFERENCE_VERSION = "2026-08-24.v1";
export const INSIGHTS_HISTORY_DAYS = 14;

export type SleepReferenceSource = "who" | "aasm";

export type SleepReferenceBand = {
  source: SleepReferenceSource;
  sourceName: string;
  publicationYear: number;
  sourceUrl: string;
  population: string;
  minAgeMonths: number;
  maxAgeMonthsExclusive: number;
  metricDefinition: "total-sleep-per-24-hours-including-naps";
  unit: "minutes-per-24-hours";
  minMinutes: number;
  maxMinutes: number;
  caveat: "guideline-context" | "no-recommendation-under-four-months";
  version: string;
};

export const SLEEP_REFERENCE_BANDS: readonly SleepReferenceBand[] = [
  {
    source: "who",
    sourceName: "World Health Organization",
    publicationYear: 2019,
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    population: "Infants aged 0–3 months",
    minAgeMonths: 0,
    maxAgeMonthsExclusive: 4,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 14 * 60,
    maxMinutes: 17 * 60,
    caveat: "guideline-context",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "who",
    sourceName: "World Health Organization",
    publicationYear: 2019,
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    population: "Infants aged 4–11 months",
    minAgeMonths: 4,
    maxAgeMonthsExclusive: 12,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 12 * 60,
    maxMinutes: 16 * 60,
    caveat: "guideline-context",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "who",
    sourceName: "World Health Organization",
    publicationYear: 2019,
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    population: "Children aged 1–2 years",
    minAgeMonths: 12,
    maxAgeMonthsExclusive: 36,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 11 * 60,
    maxMinutes: 14 * 60,
    caveat: "guideline-context",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "who",
    sourceName: "World Health Organization",
    publicationYear: 2019,
    sourceUrl: "https://www.who.int/publications/i/item/9789241550536",
    population: "Children aged 3–4 years",
    minAgeMonths: 36,
    maxAgeMonthsExclusive: 60,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 10 * 60,
    maxMinutes: 13 * 60,
    caveat: "guideline-context",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "aasm",
    sourceName: "American Academy of Sleep Medicine",
    publicationYear: 2016,
    sourceUrl: "https://aasm.org/wp-content/uploads/2017/07/Pediatricsleepdurationconsensus.pdf",
    population: "Infants aged 4–11 months",
    minAgeMonths: 4,
    maxAgeMonthsExclusive: 12,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 12 * 60,
    maxMinutes: 16 * 60,
    caveat: "no-recommendation-under-four-months",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "aasm",
    sourceName: "American Academy of Sleep Medicine",
    publicationYear: 2016,
    sourceUrl: "https://aasm.org/wp-content/uploads/2017/07/Pediatricsleepdurationconsensus.pdf",
    population: "Children aged 1–2 years",
    minAgeMonths: 12,
    maxAgeMonthsExclusive: 36,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 11 * 60,
    maxMinutes: 14 * 60,
    caveat: "no-recommendation-under-four-months",
    version: SLEEP_REFERENCE_VERSION,
  },
  {
    source: "aasm",
    sourceName: "American Academy of Sleep Medicine",
    publicationYear: 2016,
    sourceUrl: "https://aasm.org/wp-content/uploads/2017/07/Pediatricsleepdurationconsensus.pdf",
    population: "Children aged 3–5 years",
    minAgeMonths: 36,
    maxAgeMonthsExclusive: 72,
    metricDefinition: "total-sleep-per-24-hours-including-naps",
    unit: "minutes-per-24-hours",
    minMinutes: 10 * 60,
    maxMinutes: 13 * 60,
    caveat: "no-recommendation-under-four-months",
    version: SLEEP_REFERENCE_VERSION,
  },
] as const;

export type CompletedSleepSession = {
  sleep: BabyEvent;
  wake: BabyEvent;
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type PairedSleepEvents = {
  sessions: CompletedSleepSession[];
  unmatched: BabyEvent[];
};

export type DailySleepSummary = {
  ownerDate: Date;
  windowStart: Date;
  windowEnd: Date;
  totalSleepMinutes: number;
  daytimeSleepMinutes: number;
  nighttimeSleepMinutes: number;
  daytimeSessionCount: number;
  nighttimeSessionCount: number;
  daytimeAverageMinutes: number | null;
  nighttimeAverageMinutes: number | null;
  nightWakings: number;
  longestSleepMinutes: number | null;
  completePairCount: number;
  excludedUnmatchedCount: number;
  ageMonthsAtWindowEnd: number;
  references: SleepReferenceBand[];
};

export type TotalSleepGuidanceComparison = {
  status: "within" | "below" | "above" | "unavailable" | "insufficient-data";
  reference: SleepReferenceBand | null;
};

export function compareTotalSleepWithGuidance(
  summary: Pick<DailySleepSummary, "completePairCount" | "references" | "totalSleepMinutes">
): TotalSleepGuidanceComparison {
  if (summary.completePairCount === 0) {
    return { status: "insufficient-data", reference: null };
  }
  const reference = summary.references[0] ?? null;
  if (!reference) return { status: "unavailable", reference: null };
  if (summary.totalSleepMinutes < reference.minMinutes) return { status: "below", reference };
  if (summary.totalSleepMinutes > reference.maxMinutes) return { status: "above", reference };
  return { status: "within", reference };
}

function shiftOwnerDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  shifted.setHours(0, 0, 0, 0);
  return shifted;
}

function roundedMinutes(milliseconds: number): number {
  return Math.max(0, Math.round(milliseconds / MINUTE_MS));
}

export function pairSleepEvents(events: BabyEvent[]): PairedSleepEvents {
  const phases = events
    .filter((event) => event.type === "sleep" || event.type === "wake_up")
    .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const sessions: CompletedSleepSession[] = [];
  const unmatched: BabyEvent[] = [];
  let pendingSleep: BabyEvent | null = null;

  for (const event of phases) {
    if (event.type === "sleep") {
      if (pendingSleep) unmatched.push(pendingSleep);
      pendingSleep = event;
      continue;
    }
    if (!pendingSleep || event.occurredAt <= pendingSleep.occurredAt) {
      unmatched.push(event);
      continue;
    }
    sessions.push({
      sleep: pendingSleep,
      wake: event,
      start: pendingSleep.occurredAt,
      end: event.occurredAt,
      durationMinutes: roundedMinutes(event.occurredAt.getTime() - pendingSleep.occurredAt.getTime()),
    });
    pendingSleep = null;
  }
  if (pendingSleep) unmatched.push(pendingSleep);
  return { sessions, unmatched };
}

function nextClockBoundary(date: Date, daytime: boolean): Date {
  const boundary = new Date(date);
  if (daytime) {
    boundary.setHours(20, 0, 0, 0);
  } else if (date.getHours() >= 20) {
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(10, 0, 0, 0);
  } else {
    boundary.setHours(10, 0, 0, 0);
  }
  return boundary;
}

export function splitSleepAtDayNightBoundaries(start: Date, end: Date): {
  daytimeMinutes: number;
  nighttimeMinutes: number;
} {
  let cursor = start;
  let daytimeMilliseconds = 0;
  let nighttimeMilliseconds = 0;
  while (cursor < end) {
    const daytime = cursor.getHours() >= 10 && cursor.getHours() < 20;
    const boundary = nextClockBoundary(cursor, daytime);
    const segmentEnd = boundary < end ? boundary : end;
    const duration = segmentEnd.getTime() - cursor.getTime();
    if (daytime) daytimeMilliseconds += duration;
    else nighttimeMilliseconds += duration;
    cursor = segmentEnd;
  }
  return {
    daytimeMinutes: roundedMinutes(daytimeMilliseconds),
    nighttimeMinutes: roundedMinutes(nighttimeMilliseconds),
  };
}

export function sleepReferencesForAge(ageMonths: number): SleepReferenceBand[] {
  return SLEEP_REFERENCE_BANDS.filter(
    (band) => ageMonths >= band.minAgeMonths && ageMonths < band.maxAgeMonthsExclusive
  );
}

export function buildDailySleepSummary({
  events,
  ownerDate,
  startMinutes,
  dateOfBirth,
}: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  dateOfBirth: string;
}): DailySleepSummary {
  const { start: windowStart, end: windowEnd } = ownerDayWindowBounds(ownerDate, startMinutes);
  const paired = pairSleepEvents(events);
  const overlapping = paired.sessions.filter((session) => session.end > windowStart && session.start < windowEnd);
  const owned = paired.sessions.filter((session) => session.start >= windowStart && session.start < windowEnd);
  let daytimeSleepMinutes = 0;
  let nighttimeSleepMinutes = 0;
  let longestSleepMinutes: number | null = null;

  for (const session of overlapping) {
    const clippedStart = session.start > windowStart ? session.start : windowStart;
    const clippedEnd = session.end < windowEnd ? session.end : windowEnd;
    const split = splitSleepAtDayNightBoundaries(clippedStart, clippedEnd);
    daytimeSleepMinutes += split.daytimeMinutes;
    nighttimeSleepMinutes += split.nighttimeMinutes;
    const clippedMinutes = roundedMinutes(clippedEnd.getTime() - clippedStart.getTime());
    longestSleepMinutes = Math.max(longestSleepMinutes ?? 0, clippedMinutes);
  }

  const daytimeSessions = owned.filter((session) => session.start.getHours() >= 10 && session.start.getHours() < 20);
  const nighttimeSessions = owned.filter((session) => session.start.getHours() < 10 || session.start.getHours() >= 20);
  const average = (sessions: CompletedSleepSession[]) => sessions.length === 0
    ? null
    : Math.round(sessions.reduce((total, session) => total + session.durationMinutes, 0) / sessions.length);
  const ageMonthsAtWindowEnd = completedAgeMonths(dateOfBirth, windowEnd);

  return {
    ownerDate: new Date(ownerDate),
    windowStart,
    windowEnd,
    totalSleepMinutes: daytimeSleepMinutes + nighttimeSleepMinutes,
    daytimeSleepMinutes,
    nighttimeSleepMinutes,
    daytimeSessionCount: daytimeSessions.length,
    nighttimeSessionCount: nighttimeSessions.length,
    daytimeAverageMinutes: average(daytimeSessions),
    nighttimeAverageMinutes: average(nighttimeSessions),
    nightWakings: countNightWakings(events, ownerDate),
    longestSleepMinutes,
    completePairCount: overlapping.length,
    excludedUnmatchedCount: paired.unmatched.filter(
      (event) => event.occurredAt >= windowStart && event.occurredAt < windowEnd
    ).length,
    ageMonthsAtWindowEnd,
    references: sleepReferencesForAge(ageMonthsAtWindowEnd),
  };
}

export function buildSleepHistory({
  events,
  latestOwnerDate,
  startMinutes,
  dateOfBirth,
  dayCount = INSIGHTS_HISTORY_DAYS,
}: {
  events: BabyEvent[];
  latestOwnerDate: Date;
  startMinutes: number;
  dateOfBirth: string;
  dayCount?: number;
}): DailySleepSummary[] {
  return Array.from({ length: dayCount }, (_, index) =>
    buildDailySleepSummary({
      events,
      ownerDate: shiftOwnerDate(latestOwnerDate, -index),
      startMinutes,
      dateOfBirth,
    })
  );
}

export function mostRecentlyCompletedOwnerDate(now: Date, startMinutes: number): Date {
  return shiftOwnerDate(dayWindowDate(now, startMinutes), -1);
}

export function ownerDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ownerDateFromKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (ownerDateKey(date) !== value) return null;
  return date;
}
