import type { Locale } from "../i18n/messages";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";
import { completedAgeMonths } from "./profile";

export type WakeWindowRange = { minMinutes: number; maxMinutes: number };

export function wakeWindowRecommendation(dateOfBirth: string, now = new Date()): WakeWindowRange | null {
  const months = completedAgeMonths(dateOfBirth, now);
  if (months < 1) return { minMinutes: 30, maxMinutes: 60 };
  if (months < 3) return { minMinutes: 60, maxMinutes: 120 };
  if (months < 5) return { minMinutes: 75, maxMinutes: 150 };
  if (months < 7) return { minMinutes: 120, maxMinutes: 240 };
  if (months < 10) return { minMinutes: 150, maxMinutes: 270 };
  if (months < 12) return { minMinutes: 180, maxMinutes: 360 };
  return null;
}

export type SleepReminderRecord = {
  wakeId: string;
  targetAt: string;
  thresholdMinutes: number;
  locale: Locale;
  profileName: string;
  dateOfBirth: string;
};

export type SleepReminderDecision =
  | { kind: "cancel"; reason: "disabled" | "unavailable" | "sleeping" | "no-wake" | "custom-required" }
  | { kind: "keep"; wake: BabyEvent; targetAt: Date; handled: boolean }
  | { kind: "schedule"; wake: BabyEvent; targetAt: Date; scheduleAt: Date; overdue: boolean; record: SleepReminderRecord };

export function latestSleepPhase(events: BabyEvent[], now = new Date()): BabyEvent | null {
  return events
    .filter((event) => (event.type === "sleep" || event.type === "wake_up") && event.occurredAt <= now)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] ?? null;
}

export function decideSleepReminder({
  enabled,
  native,
  profile,
  events,
  thresholdOverrideMinutes,
  locale,
  record,
  now = new Date(),
}: {
  enabled: boolean;
  native: boolean;
  profile: BabyProfile | null;
  events: BabyEvent[];
  thresholdOverrideMinutes: number | null;
  locale: Locale;
  record: SleepReminderRecord | null;
  now?: Date;
}): SleepReminderDecision {
  if (!enabled) return { kind: "cancel", reason: "disabled" };
  if (!native || !profile) return { kind: "cancel", reason: "unavailable" };
  const recommendation = wakeWindowRecommendation(profile.dateOfBirth, now);
  const thresholdMinutes = thresholdOverrideMinutes ?? recommendation?.minMinutes ?? null;
  if (thresholdMinutes === null) return { kind: "cancel", reason: "custom-required" };

  const latest = latestSleepPhase(events, now);
  if (!latest) return { kind: "cancel", reason: "no-wake" };
  if (latest.type === "sleep") return { kind: "cancel", reason: "sleeping" };

  const targetAt = new Date(latest.occurredAt.getTime() + thresholdMinutes * 60_000);
  const nextRecord: SleepReminderRecord = {
    wakeId: latest.id,
    targetAt: targetAt.toISOString(),
    thresholdMinutes,
    locale,
    profileName: profile.name,
    dateOfBirth: profile.dateOfBirth,
  };
  const sameWakeAndTime =
    record?.wakeId === nextRecord.wakeId &&
    record.targetAt === nextRecord.targetAt &&
    record.thresholdMinutes === nextRecord.thresholdMinutes;
  if (sameWakeAndTime && targetAt <= now) {
    return { kind: "keep", wake: latest, targetAt, handled: true };
  }
  if (
    sameWakeAndTime &&
    record.locale === nextRecord.locale &&
    record.profileName === nextRecord.profileName &&
    record.dateOfBirth === nextRecord.dateOfBirth
  ) {
    return { kind: "keep", wake: latest, targetAt, handled: targetAt <= now };
  }

  const overdue = targetAt <= now;
  return {
    kind: "schedule",
    wake: latest,
    targetAt,
    scheduleAt: overdue ? new Date(now.getTime() + 1_000) : targetAt,
    overdue,
    record: nextRecord,
  };
}
