import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
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

export const DAILY_NOTIFICATION_ID = 1001;
export const SLEEP_NOTIFICATION_ID = 1002;
export const DAILY_ENABLED_KEY = "babyflow-reminder-enabled";
export const DAILY_TIME_KEY = "babyflow-reminder-time";
export const SLEEP_ENABLED_KEY = "babyflow-sleep-reminder-enabled";
export const SLEEP_THRESHOLD_KEY = "babyflow-sleep-reminder-threshold";
export const SLEEP_RECORD_KEY = "babyflow-sleep-reminder-record";

export type SleepReminderPreferences = {
  enabled: boolean;
  thresholdOverrideMinutes: number | null;
};

export async function notificationPermission(request: boolean): Promise<boolean> {
  let permission = await LocalNotifications.checkPermissions();
  if (request && permission.display === "prompt") {
    permission = await LocalNotifications.requestPermissions();
  }
  return permission.display === "granted";
}

export async function saveDailyReminder(enabled: boolean, time: string, locale: Locale): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error("NATIVE_NOTIFICATIONS_REQUIRED");
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIFICATION_ID }] });
  if (enabled) {
    if (!await notificationPermission(true)) throw new Error("NOTIFICATION_PERMISSION_DENIED");
    const [hour, minute] = time.split(":").map(Number);
    await LocalNotifications.schedule({ notifications: [{
      id: DAILY_NOTIFICATION_ID,
      title: translate(locale, "reminder.dailyNotificationTitle"),
      body: translate(locale, "reminder.dailyNotificationBody"),
      schedule: { on: { hour, minute }, repeats: true },
    }] });
  }
  await Preferences.set({ key: DAILY_ENABLED_KEY, value: String(enabled) });
  await Preferences.set({ key: DAILY_TIME_KEY, value: time });
}

export async function rescheduleDailyReminder(locale: Locale): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const [savedEnabled, savedTime] = await Promise.all([
    Preferences.get({ key: DAILY_ENABLED_KEY }),
    Preferences.get({ key: DAILY_TIME_KEY }),
  ]);
  if (savedEnabled.value !== "true" || !savedTime.value) return;
  if (!await notificationPermission(false)) return;
  const [hour, minute] = savedTime.value.split(":").map(Number);
  await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIFICATION_ID }] });
  await LocalNotifications.schedule({ notifications: [{
    id: DAILY_NOTIFICATION_ID,
    title: translate(locale, "reminder.dailyNotificationTitle"),
    body: translate(locale, "reminder.dailyNotificationBody"),
    schedule: { on: { hour, minute }, repeats: true },
  }] });
}

export async function loadSleepReminderPreferences(): Promise<SleepReminderPreferences> {
  const [enabled, threshold] = await Promise.all([
    Preferences.get({ key: SLEEP_ENABLED_KEY }),
    Preferences.get({ key: SLEEP_THRESHOLD_KEY }),
  ]);
  const parsed = threshold.value ? Number(threshold.value) : null;
  return {
    enabled: enabled.value === "true",
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
  await Preferences.set({ key: SLEEP_ENABLED_KEY, value: String(preferences.enabled) });
  if (preferences.thresholdOverrideMinutes === null) {
    await Preferences.remove({ key: SLEEP_THRESHOLD_KEY });
  } else {
    await Preferences.set({ key: SLEEP_THRESHOLD_KEY, value: String(preferences.thresholdOverrideMinutes) });
  }
}

async function loadRecord(): Promise<SleepReminderRecord | null> {
  const { value } = await Preferences.get({ key: SLEEP_RECORD_KEY });
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
    await Preferences.remove({ key: SLEEP_RECORD_KEY });
    return null;
  }
}

export async function cancelSleepReminder(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Promise.all([
      LocalNotifications.cancel({ notifications: [{ id: SLEEP_NOTIFICATION_ID }] }),
      LocalNotifications.removeDeliveredNotificationsById({ ids: [SLEEP_NOTIFICATION_ID] }),
    ]);
  }
  await Preferences.remove({ key: SLEEP_RECORD_KEY });
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

async function hasInexactAndroidDelivery(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== "granted";
  } catch {
    return true;
  }
}

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
  const native = Capacitor.isNativePlatform();
  let record = await loadRecord();
  if (native && record && new Date(record.targetAt) > now) {
    try {
      const pending = await LocalNotifications.getPending();
      if (!pending.notifications.some(({ id }) => id === SLEEP_NOTIFICATION_ID)) record = null;
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
    return {
      decision,
      permissionDenied: false,
      inexactAndroid: decision.targetAt > now && await hasInexactAndroidDelivery(),
    };
  }

  const recommendation = profile ? rangeLabel(profile, locale, now) : null;
  const duration = formatMinutesDuration(decision.record.thresholdMinutes, locale);
  await LocalNotifications.cancel({ notifications: [{ id: SLEEP_NOTIFICATION_ID }] });
  await LocalNotifications.removeDeliveredNotificationsById({ ids: [SLEEP_NOTIFICATION_ID] });
  await LocalNotifications.schedule({ notifications: [{
    id: SLEEP_NOTIFICATION_ID,
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
    schedule: { at: decision.scheduleAt, allowWhileIdle: true },
  }] });
  await Preferences.set({ key: SLEEP_RECORD_KEY, value: JSON.stringify(decision.record) });

  const inexactAndroid = await hasInexactAndroidDelivery();
  return { decision, permissionDenied: false, inexactAndroid };
}
