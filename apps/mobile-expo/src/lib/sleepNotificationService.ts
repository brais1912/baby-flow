import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import * as Notifications from "expo-notifications";
import { formatEventDuration } from "../i18n/format";
import type { Locale } from "../i18n/messages";
import { translate } from "../i18n/messages";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";
import { isValidDayWindowStartMinutes } from "./events";
import {
  immediateNotificationTrigger,
  isNativePlatform,
  notificationPermission,
} from "./notificationService";
import {
  mostRecentlyCompletedOwnerDate,
  ownerDateFromKey,
} from "./sleepInsights";

export const DAILY_SLEEP_SUMMARY_NOTIFICATION_ID = "1101";
export const TRANSITION_NOTIFICATION_PREFIX = "babyflow-sleep-transition-";
export const CURRENT_EVENT_TOLERANCE_MS = 10 * 60_000;
export const SLEEP_SUMMARY_DELAY_MINUTES = 5;
export const SLEEP_SUMMARY_ENABLED_KEY = "babyflow-sleep-summary-enabled";
export const TRANSITION_UPDATES_ENABLED_KEY = "babyflow-sleep-transition-enabled";
export const LAST_TRANSITION_EVENT_KEY = "babyflow-sleep-transition-last-event";
const LEGACY_SLEEP_SUMMARY_TIME_KEY = "babyflow-sleep-summary-time";
const REMINDER_CHANNEL = "reminders";
const DAILY_SLEEP_SUMMARY_CADENCE = "daily";

export type SleepNotificationPreferences = {
  summaryEnabled: boolean;
  transitionEnabled: boolean;
};

async function cancel(identifier: string): Promise<void> {
  await cancelScheduled(identifier);
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

async function cancelScheduled(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

export function dailySleepSummaryDeliveryTime(startMinutes: number): { hour: number; minute: number } {
  const deliveryMinutes = (startMinutes + SLEEP_SUMMARY_DELAY_MINUTES) % (24 * 60);
  return {
    hour: Math.floor(deliveryMinutes / 60),
    minute: deliveryMinutes % 60,
  };
}

export async function loadSleepNotificationPreferences(): Promise<SleepNotificationPreferences> {
  const values = await AsyncStorage.multiGet([
    SLEEP_SUMMARY_ENABLED_KEY,
    TRANSITION_UPDATES_ENABLED_KEY,
  ]);
  const saved = new Map(values);
  return {
    summaryEnabled: saved.get(SLEEP_SUMMARY_ENABLED_KEY) === "true",
    transitionEnabled: saved.get(TRANSITION_UPDATES_ENABLED_KEY) === "true",
  };
}

export function dailySleepSummaryContent({
  profile,
  locale,
  startMinutes,
}: {
  profile: BabyProfile;
  locale: Locale;
  startMinutes: number;
}): Notifications.NotificationContentInput {
  return {
    title: translate(locale, "sleepNotifications.summaryNotificationReadyTitle", { name: profile.name }),
    body: translate(locale, "sleepNotifications.summaryNotificationReady", { name: profile.name }),
    data: {
      type: "sleep-summary",
      cadence: DAILY_SLEEP_SUMMARY_CADENCE,
      startMinutes,
      locale,
      profileName: profile.name,
    },
    sound: true,
  };
}

function matchesDailySummarySchedule(
  request: Notifications.NotificationRequest,
  startMinutes: number,
  profile: BabyProfile,
  locale: Locale
): boolean {
  const data = request.content.data;
  return request.identifier === DAILY_SLEEP_SUMMARY_NOTIFICATION_ID &&
    data?.type === "sleep-summary" &&
    data.cadence === DAILY_SLEEP_SUMMARY_CADENCE &&
    data.startMinutes === startMinutes &&
    data.locale === locale &&
    data.profileName === profile.name;
}

async function scheduleDailySummary({
  startMinutes,
  profile,
  locale,
}: {
  startMinutes: number;
  profile: BabyProfile;
  locale: Locale;
}): Promise<void> {
  const { hour, minute } = dailySleepSummaryDeliveryTime(startMinutes);
  await cancelScheduled(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
    content: dailySleepSummaryContent({ profile, locale, startMinutes }),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL,
    },
  });
}

export async function saveDailySleepSummaryPreference({
  enabled,
  startMinutes,
  profile,
  locale,
}: {
  enabled: boolean;
  startMinutes: number;
  profile: BabyProfile;
  locale: Locale;
}): Promise<void> {
  if (!isNativePlatform()) throw new Error("NATIVE_NOTIFICATIONS_REQUIRED");
  if (enabled && !await notificationPermission(true)) {
    await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    await AsyncStorage.setItem(SLEEP_SUMMARY_ENABLED_KEY, "false");
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }
  if (enabled) {
    await scheduleDailySummary({ startMinutes, profile, locale });
  } else {
    await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  }
  await AsyncStorage.setItem(SLEEP_SUMMARY_ENABLED_KEY, String(enabled));
  await AsyncStorage.removeItem(LEGACY_SLEEP_SUMMARY_TIME_KEY);
}

export async function reconcileDailySleepSummary({
  startMinutes,
  profile,
  locale,
}: {
  startMinutes: number;
  profile: BabyProfile;
  locale: Locale;
}): Promise<void> {
  const preferences = await loadSleepNotificationPreferences();
  if (!preferences.summaryEnabled || !isNativePlatform() || !await notificationPermission(false)) {
    await cancel(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    return;
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  if (scheduled.some((request) => matchesDailySummarySchedule(request, startMinutes, profile, locale))) {
    return;
  }
  await scheduleDailySummary({ startMinutes, profile, locale });
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
    trigger: immediateNotificationTrigger(),
  });
  await AsyncStorage.setItem(LAST_TRANSITION_EVENT_KEY, event.id);
  return true;
}

export function sleepSummaryOwnerDateFromResponse(
  response: Notifications.NotificationResponse
): Date | null {
  const data = response.notification.request.content.data;
  const exactOwnerDate = sleepSummaryOwnerDateFromData(data);
  if (exactOwnerDate) return exactOwnerDate;
  if (
    data?.type !== "sleep-summary" ||
    data.cadence !== DAILY_SLEEP_SUMMARY_CADENCE ||
    typeof data.startMinutes !== "number" ||
    !isValidDayWindowStartMinutes(data.startMinutes)
  ) return null;
  const rawDate = response.notification.date;
  if (!Number.isFinite(rawDate) || rawDate <= 0) return null;
  const deliveryDate = new Date(rawDate < 10_000_000_000 ? rawDate * 1000 : rawDate);
  if (Number.isNaN(deliveryDate.getTime())) return null;
  return mostRecentlyCompletedOwnerDate(deliveryDate, data.startMinutes);
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
    AsyncStorage.removeItem(LEGACY_SLEEP_SUMMARY_TIME_KEY),
    AsyncStorage.removeItem(TRANSITION_UPDATES_ENABLED_KEY),
  ]);
}
