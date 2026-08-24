import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import * as Notifications from "expo-notifications";
import { formatEventDuration } from "../i18n/format";
import type { Locale } from "../i18n/messages";
import { translate } from "../i18n/messages";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";
import { isNativePlatform, notificationPermission } from "./notificationService";
import type { DailySleepSummary } from "./sleepInsights";
import { ownerDateFromKey, ownerDateKey } from "./sleepInsights";

export const DAILY_SLEEP_SUMMARY_NOTIFICATION_ID = "1101";
export const TRANSITION_NOTIFICATION_PREFIX = "babyflow-sleep-transition-";
export const CURRENT_EVENT_TOLERANCE_MS = 5 * 60_000;
export const SLEEP_SUMMARY_ENABLED_KEY = "babyflow-sleep-summary-enabled";
export const SLEEP_SUMMARY_TIME_KEY = "babyflow-sleep-summary-time";
export const TRANSITION_UPDATES_ENABLED_KEY = "babyflow-sleep-transition-enabled";
export const LAST_TRANSITION_EVENT_KEY = "babyflow-sleep-transition-last-event";
const REMINDER_CHANNEL = "reminders";

export type SleepNotificationPreferences = {
  summaryEnabled: boolean;
  summaryTime: string;
  transitionEnabled: boolean;
};

async function cancel(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

function validTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function nextDailySleepSummaryDate(now: Date, time: string): Date | null {
  const parsed = validTime(time);
  if (!parsed) return null;
  const next = new Date(now);
  next.setHours(parsed.hour, parsed.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export async function loadSleepNotificationPreferences(): Promise<SleepNotificationPreferences> {
  const values = await AsyncStorage.multiGet([
    SLEEP_SUMMARY_ENABLED_KEY,
    SLEEP_SUMMARY_TIME_KEY,
    TRANSITION_UPDATES_ENABLED_KEY,
  ]);
  const saved = new Map(values);
  const time = saved.get(SLEEP_SUMMARY_TIME_KEY) ?? "20:00";
  return {
    summaryEnabled: saved.get(SLEEP_SUMMARY_ENABLED_KEY) === "true",
    summaryTime: validTime(time) ? time : "20:00",
    transitionEnabled: saved.get(TRANSITION_UPDATES_ENABLED_KEY) === "true",
  };
}

function referenceRange(summary: DailySleepSummary, locale: Locale): string | null {
  const reference = summary.references[0];
  if (!reference) return null;
  return translate(locale, "insights.referenceRange", {
    min: formatEventDuration(reference.minMinutes * 60_000, locale),
    max: formatEventDuration(reference.maxMinutes * 60_000, locale),
  });
}

function completedAverage(value: number | null, locale: Locale): string {
  return value === null
    ? translate(locale, "insights.noAverage")
    : formatEventDuration(value * 60_000, locale);
}

function wakingLabel(count: number, locale: Locale): string {
  return translate(
    locale,
    count === 1 ? "sleepNotifications.wakingOne" : "sleepNotifications.wakingMany",
    { count }
  );
}

export function dailySleepSummaryContent({
  summary,
  profile,
  locale,
}: {
  summary: DailySleepSummary;
  profile: BabyProfile;
  locale: Locale;
}): Notifications.NotificationContentInput {
  const dateLocale = locale === "es" ? es : enUS;
  const date = format(summary.ownerDate, "d MMM", { locale: dateLocale });
  const values = {
    name: profile.name,
    total: formatEventDuration(summary.totalSleepMinutes * 60_000, locale),
    dayAverage: completedAverage(summary.daytimeAverageMinutes, locale),
    nightAverage: completedAverage(summary.nighttimeAverageMinutes, locale),
    wakings: wakingLabel(summary.nightWakings, locale),
  };
  const range = referenceRange(summary, locale);
  return {
    title: translate(locale, "sleepNotifications.summaryNotificationTitle", { name: profile.name, date }),
    body: summary.completePairCount === 0
      ? translate(locale, "sleepNotifications.summaryNotificationIncomplete", {
          name: profile.name,
          wakings: values.wakings,
        })
      : range
        ? translate(locale, "sleepNotifications.summaryNotificationBody", { ...values, range })
        : translate(locale, "sleepNotifications.summaryNotificationBodyNoReference", values),
    data: {
      type: "sleep-summary",
      ownerDate: ownerDateKey(summary.ownerDate),
      windowStart: summary.windowStart.toISOString(),
      windowEnd: summary.windowEnd.toISOString(),
      url: `com.babyflow.app://insights/sleep/${ownerDateKey(summary.ownerDate)}`,
    },
    sound: true,
  };
}

async function scheduleDailySummary({
  summary,
  profile,
  locale,
  time,
  now,
}: {
  summary: DailySleepSummary;
  profile: BabyProfile;
  locale: Locale;
  time: string;
  now: Date;
}): Promise<void> {
  const date = nextDailySleepSummaryDate(now, time);
  if (!date) throw new Error("INVALID_REMINDER_TIME");
  await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
    content: dailySleepSummaryContent({ summary, profile, locale }),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDER_CHANNEL,
    },
  });
}

export async function saveDailySleepSummaryPreference({
  enabled,
  time,
  summary,
  profile,
  locale,
  now = new Date(),
}: {
  enabled: boolean;
  time: string;
  summary: DailySleepSummary;
  profile: BabyProfile;
  locale: Locale;
  now?: Date;
}): Promise<void> {
  if (!isNativePlatform()) throw new Error("NATIVE_NOTIFICATIONS_REQUIRED");
  if (enabled && !await notificationPermission(true)) {
    await AsyncStorage.setItem(SLEEP_SUMMARY_ENABLED_KEY, "false");
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }
  await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  if (enabled) await scheduleDailySummary({ summary, profile, locale, time, now });
  await AsyncStorage.multiSet([
    [SLEEP_SUMMARY_ENABLED_KEY, String(enabled)],
    [SLEEP_SUMMARY_TIME_KEY, time],
  ]);
}

export async function reconcileDailySleepSummary({
  summary,
  profile,
  locale,
  now = new Date(),
}: {
  summary: DailySleepSummary;
  profile: BabyProfile;
  locale: Locale;
  now?: Date;
}): Promise<void> {
  const preferences = await loadSleepNotificationPreferences();
  if (!preferences.summaryEnabled || !isNativePlatform() || !await notificationPermission(false)) {
    await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    return;
  }
  await scheduleDailySummary({
    summary,
    profile,
    locale,
    time: preferences.summaryTime,
    now,
  });
}

async function cancelLastTransition(): Promise<void> {
  const lastEventId = await AsyncStorage.getItem(LAST_TRANSITION_EVENT_KEY);
  if (lastEventId) await cancel(`${TRANSITION_NOTIFICATION_PREFIX}${lastEventId}`);
  await AsyncStorage.removeItem(LAST_TRANSITION_EVENT_KEY);
}

export async function saveTransitionUpdatesPreference(enabled: boolean): Promise<void> {
  if (!isNativePlatform()) throw new Error("NATIVE_NOTIFICATIONS_REQUIRED");
  if (enabled && !await notificationPermission(true)) {
    await AsyncStorage.setItem(TRANSITION_UPDATES_ENABLED_KEY, "false");
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }
  if (!enabled) await cancelLastTransition();
  await AsyncStorage.setItem(TRANSITION_UPDATES_ENABLED_KEY, String(enabled));
}

export function isCurrentTransitionEvent(event: BabyEvent, now = new Date()): boolean {
  return Math.abs(now.getTime() - event.occurredAt.getTime()) <= CURRENT_EVENT_TOLERANCE_MS &&
    Math.abs(now.getTime() - event.createdAt.getTime()) <= CURRENT_EVENT_TOLERANCE_MS;
}

export function precedingTransitionEvent(events: BabyEvent[], event: BabyEvent): BabyEvent | null {
  const preceding = events
    .filter((candidate) =>
      (candidate.type === "sleep" || candidate.type === "wake_up") &&
      candidate.id !== event.id &&
      candidate.occurredAt < event.occurredAt
    )
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] ?? null;
  if (!preceding) return null;
  if (event.type === "sleep" && preceding.type === "wake_up") return preceding;
  if (event.type === "wake_up" && preceding.type === "sleep") return preceding;
  return null;
}

export function sleepTransitionContent({
  event,
  preceding,
  profile,
  locale,
}: {
  event: BabyEvent;
  preceding: BabyEvent | null;
  profile: BabyProfile;
  locale: Locale;
}): Notifications.NotificationContentInput {
  const time = format(event.occurredAt, "HH:mm");
  if (preceding) {
    const duration = formatEventDuration(event.occurredAt.getTime() - preceding.occurredAt.getTime(), locale);
    return {
      title: translate(locale, "sleepNotifications.transitionNotificationTitle", { name: profile.name }),
      body: translate(
        locale,
        event.type === "wake_up"
          ? "sleepNotifications.transitionWakeBody"
          : "sleepNotifications.transitionSleepBody",
        { name: profile.name, duration }
      ),
      sound: true,
    };
  }
  return {
    title: translate(locale, "sleepNotifications.transitionNotificationTitle", { name: profile.name }),
    body: translate(
      locale,
      event.type === "wake_up"
        ? "sleepNotifications.transitionWakeFallback"
        : "sleepNotifications.transitionSleepFallback",
      { name: profile.name, time }
    ),
    sound: true,
  };
}

export async function sendSleepTransitionUpdate({
  event,
  events,
  profile,
  locale,
  now = new Date(),
}: {
  event: BabyEvent;
  events: BabyEvent[];
  profile: BabyProfile;
  locale: Locale;
  now?: Date;
}): Promise<boolean> {
  if ((event.type !== "sleep" && event.type !== "wake_up") || !isCurrentTransitionEvent(event, now)) return false;
  const preferences = await loadSleepNotificationPreferences();
  if (!preferences.transitionEnabled || !isNativePlatform() || !await notificationPermission(false)) return false;
  const lastEventId = await AsyncStorage.getItem(LAST_TRANSITION_EVENT_KEY);
  if (lastEventId === event.id) return false;
  const identifier = `${TRANSITION_NOTIFICATION_PREFIX}${event.id}`;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: sleepTransitionContent({
      event,
      preceding: precedingTransitionEvent(events, event),
      profile,
      locale,
    }),
    trigger: null,
  });
  await AsyncStorage.setItem(LAST_TRANSITION_EVENT_KEY, event.id);
  return true;
}

export function sleepSummaryOwnerDateFromResponse(
  response: Notifications.NotificationResponse
): Date | null {
  return sleepSummaryOwnerDateFromData(response.notification.request.content.data);
}

export function sleepSummaryOwnerDateFromData(data: Record<string, unknown> | undefined): Date | null {
  if (data?.type !== "sleep-summary" || typeof data.ownerDate !== "string") return null;
  return ownerDateFromKey(data.ownerDate);
}

export function sleepSummaryOwnerDateFromUrl(value: string | null): Date | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.protocol !== "com.babyflow.app:" || url.hostname !== "insights" || parts[0] !== "sleep") {
      return null;
    }
    return ownerDateFromKey(parts[1] ?? "");
  } catch {
    return null;
  }
}

export async function clearSleepNotificationState(): Promise<void> {
  await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  await cancelLastTransition();
  await Promise.all([
    AsyncStorage.removeItem(SLEEP_SUMMARY_ENABLED_KEY),
    AsyncStorage.removeItem(SLEEP_SUMMARY_TIME_KEY),
    AsyncStorage.removeItem(TRANSITION_UPDATES_ENABLED_KEY),
  ]);
}
