import * as Notifications from "expo-notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import {
  CURRENT_EVENT_TOLERANCE_MS,
  DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
  LAST_TRANSITION_EVENT_KEY,
  SLEEP_SUMMARY_DELAY_MINUTES,
  SLEEP_SUMMARY_ENABLED_KEY,
  TRANSITION_UPDATES_ENABLED_KEY,
  clearSleepNotificationState,
  dailySleepSummaryContent,
  dailySleepSummaryDeliveryTime,
  isCurrentTransitionEvent,
  loadSleepNotificationPreferences,
  reconcileDailySleepSummary,
  saveDailySleepSummaryPreference,
  saveTransitionUpdatesPreference,
  sendSleepTransitionUpdate,
  sleepSummaryOwnerDateFromData,
  sleepSummaryOwnerDateFromResponse,
  sleepSummaryOwnerDateFromUrl,
  sleepTransitionContent,
} from "./sleepNotificationService";
import * as platform from "./platform";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
    multiGet: vi.fn(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null])),
    multiSet: vi.fn(async (values: [string, string][]) => { values.forEach(([key, value]) => storage.set(key, value)); }),
  },
}));

function event(id: string, type: EventType, occurredAt: Date, createdAt = occurredAt): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function recurringSummaryResponse(date: number, startMinutes: number): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date,
      request: {
        identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
        trigger: null,
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          data: { type: "sleep-summary", cadence: "daily", startMinutes },
        },
      },
    },
  };
}

describe("sleep notification service", () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(platform, "currentPlatform").mockReturnValue("ios");
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: "never",
      status: Notifications.PermissionStatus.GRANTED,
    });
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
  });

  it("keeps both new preferences disabled by default", async () => {
    await expect(loadSleepNotificationPreferences()).resolves.toEqual({
      summaryEnabled: false,
      transitionEnabled: false,
    });
  });

  it("requests permission contextually and leaves a denied feature disabled", async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: true,
      expires: "never",
      status: Notifications.PermissionStatus.DENIED,
    });
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: "never",
      status: Notifications.PermissionStatus.DENIED,
    });
    await expect(saveTransitionUpdatesPreference(true)).rejects.toThrow("NOTIFICATION_PERMISSION_DENIED");
    expect(storage.get(TRANSITION_UPDATES_ENABLED_KEY)).toBe("false");
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledOnce();
  });

  it("schedules a genuinely recurring daily summary without freezing partial totals", async () => {
    await saveDailySleepSummaryPreference({
      enabled: true,
      startMinutes: 10 * 60,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    });
    expect(storage.get(SLEEP_SUMMARY_ENABLED_KEY)).toBe("true");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
      content: expect.objectContaining({
        title: "Luna's sleep summary is ready",
        body: "Luna's sleep day has ended. Open BabyFlow to load the latest recorded events and see the latest summary.",
        data: expect.objectContaining({
          cadence: "daily",
          startMinutes: 10 * 60,
          type: "sleep-summary",
        }),
      }),
      trigger: expect.objectContaining({ hour: 10, minute: 5, type: "daily" }),
    }));
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled();
  });

  it("uses the configured owner-day boundary for the repeating wall-clock time", () => {
    expect(SLEEP_SUMMARY_DELAY_MINUTES).toBe(5);
    expect(dailySleepSummaryDeliveryTime(10 * 60)).toEqual({ hour: 10, minute: 5 });
    expect(dailySleepSummaryDeliveryTime(22 * 60)).toEqual({ hour: 22, minute: 5 });
    expect(dailySleepSummaryDeliveryTime(0)).toEqual({ hour: 0, minute: 5 });
  });

  it("uses truthful transition duration and fallback content", () => {
    const wake = event("wake", "wake_up", new Date(2026, 7, 24, 10));
    const sleep = event("sleep", "sleep", new Date(2026, 7, 24, 8));
    expect(sleepTransitionContent({
      event: wake,
      preceding: sleep,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    }).body).toBe("Luna slept for 2h.");
    expect(sleepTransitionContent({
      event: sleep,
      preceding: null,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    }).body).toBe("Luna went to sleep at 08:00. No preceding wake-up was available.");
  });

  it("includes the ten-minute tolerance boundary and rejects historical events", () => {
    const now = new Date(2026, 7, 24, 10);
    expect(CURRENT_EVENT_TOLERANCE_MS).toBe(10 * 60_000);
    expect(isCurrentTransitionEvent(event(
      "boundary",
      "sleep",
      new Date(now.getTime() - CURRENT_EVENT_TOLERANCE_MS),
      now
    ), now)).toBe(true);
    expect(isCurrentTransitionEvent(event(
      "old",
      "sleep",
      new Date(now.getTime() - CURRENT_EVENT_TOLERANCE_MS - 1),
      now
    ), now)).toBe(false);
  });

  it("does not send disabled, historical, or duplicate transition notifications", async () => {
    const now = new Date(2026, 7, 24, 10);
    const wake = event("wake", "wake_up", now);
    const input = {
      event: wake,
      events: [event("sleep", "sleep", new Date(2026, 7, 24, 8)), wake],
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en" as const,
      now,
    };
    await expect(sendSleepTransitionUpdate(input)).resolves.toBe(false);
    storage.set(TRANSITION_UPDATES_ENABLED_KEY, "true");
    await expect(sendSleepTransitionUpdate(input)).resolves.toBe(true);
    await expect(sendSleepTransitionUpdate(input)).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledOnce();
  });

  it("uses the configured high-importance channel for immediate Android transitions", async () => {
    vi.spyOn(platform, "currentPlatform").mockReturnValue("android");
    storage.set(TRANSITION_UPDATES_ENABLED_KEY, "true");
    const now = new Date(2026, 7, 24, 10);
    const wake = event("wake-android", "wake_up", now);

    await sendSleepTransitionUpdate({
      event: wake,
      events: [event("sleep-android", "sleep", new Date(2026, 7, 24, 8)), wake],
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
      now,
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      trigger: { channelId: "reminders" },
    }));
  });

  it("replaces the stable daily schedule after boundary or locale changes and cancels it when disabled", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    await reconcileDailySleepSummary({
      startMinutes: 12 * 60,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "es",
    });
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
      content: expect.objectContaining({
        title: "El resumen de sueño de Luna está listo",
        data: expect.objectContaining({ locale: "es", startMinutes: 12 * 60 }),
      }),
      trigger: expect.objectContaining({ hour: 12, minute: 5, type: "daily" }),
    }));

    await saveDailySleepSummaryPreference({
      enabled: false,
      startMinutes: 12 * 60,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "es",
    });
    expect(storage.get(SLEEP_SUMMARY_ENABLED_KEY)).toBe("false");
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenLastCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  });

  it("keeps an equivalent repeating schedule instead of recreating it on app launch", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{
      identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
      content: {
        title: "Luna's sleep summary is ready",
        subtitle: null,
        body: "Ready",
        data: {
          type: "sleep-summary",
          cadence: "daily",
          startMinutes: 10 * 60,
          locale: "en",
          profileName: "Luna",
        },
        sound: null,
        categoryIdentifier: null,
      },
      trigger: null,
    }]);

    await reconcileDailySleepSummary({
      startMinutes: 10 * 60,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    });

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("cancels the pending summary when notification permission is revoked", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: "never",
      status: Notifications.PermissionStatus.DENIED,
    });

    await reconcileDailySleepSummary({
      startMinutes: 12 * 60,
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    });

    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("clears both sleep notification preferences and pending identifiers at sign-out", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    storage.set("babyflow-sleep-summary-time", "20:00");
    storage.set(TRANSITION_UPDATES_ENABLED_KEY, "true");
    storage.set(LAST_TRANSITION_EVENT_KEY, "event-1");

    await clearSleepNotificationState();

    expect(storage.size).toBe(0);
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith("babyflow-sleep-transition-event-1");
  });

  it("builds content that can remain truthful across every recurrence", () => {
    expect(dailySleepSummaryContent({
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
      startMinutes: 10 * 60,
    })).toEqual(expect.objectContaining({
      title: "Luna's sleep summary is ready",
      body: expect.not.stringContaining("Luna slept"),
    }));
  });

  it("routes only valid sleep-summary notification destinations", () => {
    expect(sleepSummaryOwnerDateFromData({ type: "sleep-summary", ownerDate: "2026-08-23" }))
      .toEqual(new Date(2026, 7, 23));
    expect(sleepSummaryOwnerDateFromData({ type: "other", ownerDate: "2026-08-23" })).toBeNull();
    expect(sleepSummaryOwnerDateFromData({ type: "sleep-summary", ownerDate: "invalid" })).toBeNull();
    expect(sleepSummaryOwnerDateFromUrl("com.babyflow.app://insights/sleep/2026-08-23"))
      .toEqual(new Date(2026, 7, 23));
    expect(sleepSummaryOwnerDateFromUrl("com.babyflow.app://settings/2026-08-23")).toBeNull();
  });

  it("derives the completed owner day from recurring iOS and Android delivery timestamps", () => {
    const delivery = new Date(2026, 8, 1, 10, 5);
    expect(sleepSummaryOwnerDateFromResponse(
      recurringSummaryResponse(delivery.getTime() / 1000, 10 * 60)
    )).toEqual(new Date(2026, 7, 31));
    expect(sleepSummaryOwnerDateFromResponse(
      recurringSummaryResponse(delivery.getTime(), 10 * 60)
    )).toEqual(new Date(2026, 7, 31));
  });

  it("rejects recurring summary responses without a valid boundary or delivery date", () => {
    expect(sleepSummaryOwnerDateFromResponse(recurringSummaryResponse(0, 10 * 60))).toBeNull();
    expect(sleepSummaryOwnerDateFromResponse(recurringSummaryResponse(Date.now(), 7))).toBeNull();
  });
});
