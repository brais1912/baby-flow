import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { formatMinutesDuration } from "../i18n/format";
import type { Locale } from "../i18n/messages";
import { translate } from "../i18n/messages";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";
import {
  decideSleepReminder,
  wakeWindowRecommendation,
  type SleepReminderDecision,
  type SleepReminderRecord,
} from "./wakeWindow";
import { currentPlatform } from "./platform";

export const DAILY_NOTIFICATION_ID = "1001";
export const SLEEP_NOTIFICATION_ID = "1002";
export const DAILY_ENABLED_KEY = "babyflow-reminder-enabled";
export const DAILY_TIME_KEY = "babyflow-reminder-time";
export const SLEEP_ENABLED_KEY = "babyflow-sleep-reminder-enabled";
export const SLEEP_THRESHOLD_KEY = "babyflow-sleep-reminder-threshold";
export const SLEEP_RECORD_KEY = "babyflow-sleep-reminder-record";
const REMINDER_CHANNEL = "reminders";

export type SleepReminderPreferences = {
  enabled: boolean;
  thresholdOverrideMinutes: number | null;
};

export function isNativePlatform(): boolean {
  const platform = currentPlatform();
  return platform === "ios" || platform === "android";
}

export function initializeNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (currentPlatform() === "android") {
    void Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: "BabyFlow reminders",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#7c3aed",
      vibrationPattern: [0, 200, 100, 200],
    });
  }
}

function permissionGranted(permission: Notifications.NotificationPermissionsStatus): boolean {
  return permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

export async function notificationPermission(request: boolean): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (currentPlatform() === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: "BabyFlow reminders",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#7c3aed",
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (request && !permissionGranted(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  return permissionGranted(permission);
}

async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

export async function saveDailyReminder(enabled: boolean, time: string, locale: Locale): Promise<void> {
  if (!isNativePlatform()) throw new Error("NATIVE_NOTIFICATIONS_REQUIRED");
  await cancelNotification(DAILY_NOTIFICATION_ID);
  if (enabled) {
    if (!await notificationPermission(true)) throw new Error("NOTIFICATION_PERMISSION_DENIED");
    const [hour, minute] = time.split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) throw new Error("INVALID_REMINDER_TIME");
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_NOTIFICATION_ID,
      content: {
        title: translate(locale, "reminder.dailyNotificationTitle"),
        body: translate(locale, "reminder.dailyNotificationBody"),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: REMINDER_CHANNEL,
      },
    });
  }
  await AsyncStorage.multiSet([
    [DAILY_ENABLED_KEY, String(enabled)],
    [DAILY_TIME_KEY, time],
  ]);
}

export async function rescheduleDailyReminder(locale: Locale): Promise<void> {
  if (!isNativePlatform()) return;
  const values = await AsyncStorage.multiGet([DAILY_ENABLED_KEY, DAILY_TIME_KEY]);
  const saved = new Map(values);
  const time = saved.get(DAILY_TIME_KEY);
  if (saved.get(DAILY_ENABLED_KEY) !== "true" || !time) return;
  if (!await notificationPermission(false)) return;
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return;
  await cancelNotification(DAILY_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_NOTIFICATION_ID,
    content: {
      title: translate(locale, "reminder.dailyNotificationTitle"),
      body: translate(locale, "reminder.dailyNotificationBody"),
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL,
    },
  });
}

export async function loadDailyReminderPreferences(): Promise<{ enabled: boolean; time: string }> {
  const values = await AsyncStorage.multiGet([DAILY_ENABLED_KEY, DAILY_TIME_KEY]);
  const saved = new Map(values);
  return {
    enabled: saved.get(DAILY_ENABLED_KEY) === "true",
    time: saved.get(DAILY_TIME_KEY) || "20:00",
  };
}

export async function loadSleepReminderPreferences(): Promise<SleepReminderPreferences> {
  const values = await AsyncStorage.multiGet([SLEEP_ENABLED_KEY, SLEEP_THRESHOLD_KEY]);
  const saved = new Map(values);
  const rawThreshold = saved.get(SLEEP_THRESHOLD_KEY);
  const parsed = rawThreshold ? Number(rawThreshold) : null;
  return {
    enabled: saved.get(SLEEP_ENABLED_KEY) === "true",
    thresholdOverrideMinutes:
      parsed !== null &&
      Number.isInteger(parsed) &&
      parsed >= 15 &&
      parsed <= 720 &&
      parsed % 15 === 0
        ? parsed
        : null,
  };
}

export async function storeSleepReminderPreferences(preferences: SleepReminderPreferences): Promise<void> {
  await AsyncStorage.setItem(SLEEP_ENABLED_KEY, String(preferences.enabled));
  if (preferences.thresholdOverrideMinutes === null) {
    await AsyncStorage.removeItem(SLEEP_THRESHOLD_KEY);
  } else {
    await AsyncStorage.setItem(SLEEP_THRESHOLD_KEY, String(preferences.thresholdOverrideMinutes));
  }
}

async function loadRecord(): Promise<SleepReminderRecord | null> {
  const value = await AsyncStorage.getItem(SLEEP_RECORD_KEY);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("wakeId" in parsed) || typeof parsed.wakeId !== "string" ||
      !("targetAt" in parsed) || typeof parsed.targetAt !== "string" ||
      !("thresholdMinutes" in parsed) || typeof parsed.thresholdMinutes !== "number" ||
      !("locale" in parsed) || (parsed.locale !== "en" && parsed.locale !== "es") ||
      !("profileName" in parsed) || typeof parsed.profileName !== "string" ||
      !("dateOfBirth" in parsed) || typeof parsed.dateOfBirth !== "string"
    ) throw new Error("INVALID_SLEEP_REMINDER_RECORD");
    return {
      wakeId: parsed.wakeId,
      targetAt: parsed.targetAt,
      thresholdMinutes: parsed.thresholdMinutes,
      locale: parsed.locale,
      profileName: parsed.profileName,
      dateOfBirth: parsed.dateOfBirth,
    };
  } catch {
    await AsyncStorage.removeItem(SLEEP_RECORD_KEY);
    return null;
  }
}

export async function cancelSleepReminder(): Promise<void> {
  if (isNativePlatform()) await cancelNotification(SLEEP_NOTIFICATION_ID);
  await AsyncStorage.removeItem(SLEEP_RECORD_KEY);
}

function rangeLabel(profile: BabyProfile, locale: Locale, now: Date): string | null {
  const range = wakeWindowRecommendation(profile.dateOfBirth, now);
  if (!range) return null;
  if (range.minMinutes % 60 === 0 && range.maxMinutes % 60 === 0) {
    return translate(locale, "sleepReminder.rangeHours", {
      min: range.minMinutes / 60,
      max: range.maxMinutes / 60,
    });
  }
  return translate(locale, "sleepReminder.rangeMinutes", {
    min: range.minMinutes,
    max: range.maxMinutes,
  });
}

export type ReconcileResult = {
  decision: SleepReminderDecision;
  permissionDenied: boolean;
  inexactAndroid: boolean;
};

export async function reconcileSleepReminder({
  preferences,
  profile,
  events,
  locale,
  now = new Date(),
}: {
  preferences: SleepReminderPreferences;
  profile: BabyProfile | null;
  events: BabyEvent[];
  locale: Locale;
  now?: Date;
}): Promise<ReconcileResult> {
  const native = isNativePlatform();
  let record = await loadRecord();
  if (native && record && new Date(record.targetAt) > now) {
    try {
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      if (!pending.some(({ identifier }) => identifier === SLEEP_NOTIFICATION_ID)) record = null;
    } catch {
      record = null;
    }
  }
  const decision = decideSleepReminder({
    enabled: preferences.enabled,
    native,
    profile,
    events,
    thresholdOverrideMinutes: preferences.thresholdOverrideMinutes,
    locale,
    record,
    now,
  });

  if (decision.kind === "cancel") {
    await cancelSleepReminder();
    return { decision, permissionDenied: false, inexactAndroid: false };
  }
  if (!await notificationPermission(false)) {
    await cancelSleepReminder();
    return { decision, permissionDenied: true, inexactAndroid: false };
  }
  if (decision.kind === "keep") {
    return { decision, permissionDenied: false, inexactAndroid: false };
  }

  const recommendation = profile ? rangeLabel(profile, locale, now) : null;
  const duration = formatMinutesDuration(decision.record.thresholdMinutes, locale);
  await cancelNotification(SLEEP_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: SLEEP_NOTIFICATION_ID,
    content: {
      title: translate(locale, "sleepReminder.notificationTitle", { name: decision.record.profileName }),
      body: recommendation
        ? translate(locale, "sleepReminder.notificationBody", {
            name: decision.record.profileName,
            duration,
            range: recommendation,
          })
        : translate(locale, "sleepReminder.notificationBodyCustom", {
            name: decision.record.profileName,
            duration,
          }),
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: decision.scheduleAt,
      channelId: REMINDER_CHANNEL,
    },
  });
  await AsyncStorage.setItem(SLEEP_RECORD_KEY, JSON.stringify(decision.record));
  return { decision, permissionDenied: false, inexactAndroid: false };
}
