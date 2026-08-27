import * as Notifications from "expo-notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import type { DailySleepSummary } from "./sleepInsights";
import {
  CURRENT_EVENT_TOLERANCE_MS,
  DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
  LAST_TRANSITION_EVENT_KEY,
  SLEEP_SUMMARY_ENABLED_KEY,
  SLEEP_SUMMARY_TIME_KEY,
  TRANSITION_UPDATES_ENABLED_KEY,
  clearSleepNotificationState,
  dailySleepSummaryContent,
  isCurrentTransitionEvent,
  loadSleepNotificationPreferences,
  nextDailySleepSummaryDate,
  reconcileDailySleepSummary,
  saveDailySleepSummaryPreference,
  saveTransitionUpdatesPreference,
  sendSleepTransitionUpdate,
  sleepSummaryOwnerDateFromData,
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

function summary(): DailySleepSummary {
  const ownerDate = new Date(2026, 7, 23);
  return {
    ownerDate,
    windowStart: new Date(2026, 7, 23, 12),
    windowEnd: new Date(2026, 7, 24, 12),
    totalSleepMinutes: 785,
    daytimeSleepMinutes: 105,
    nighttimeSleepMinutes: 680,
    daytimeSessionCount: 2,
    nighttimeSessionCount: 3,
    daytimeAverageMinutes: 52,
    nighttimeAverageMinutes: 190,
    nightWakings: 2,
    longestSleepMinutes: 320,
    completePairCount: 5,
    excludedUnmatchedCount: 0,
    ageMonthsAtWindowEnd: 6,
    references: [{
      source: "who",
      sourceName: "World Health Organization",
      publicationYear: 2019,
      sourceUrl: "https://example.com",
      population: "Infants aged 4–11 months",
      minAgeMonths: 4,
      maxAgeMonthsExclusive: 12,
      metricDefinition: "total-sleep-per-24-hours-including-naps",
      unit: "minutes-per-24-hours",
      minMinutes: 720,
      maxMinutes: 960,
      caveat: "guideline-context",
      version: "test",
    }],
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
  });

  it("keeps both new preferences disabled by default", async () => {
    await expect(loadSleepNotificationPreferences()).resolves.toEqual({
      summaryEnabled: false,
      summaryTime: "20:00",
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

  it("schedules a stable one-shot daily summary with its owner-day destination", async () => {
    await saveDailySleepSummaryPreference({
      enabled: true,
      time: "20:15",
      summary: summary(),
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
      now: new Date(2026, 7, 24, 12),
    });
    expect(storage.get(SLEEP_SUMMARY_ENABLED_KEY)).toBe("true");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
      content: expect.objectContaining({
        body: expect.stringContaining("Naps averaged 52 min"),
        data: expect.objectContaining({ ownerDate: "2026-08-23", type: "sleep-summary" }),
      }),
      trigger: expect.objectContaining({ date: new Date(2026, 7, 24, 20, 15), type: "date" }),
    }));
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

  it("moves an elapsed daily time to the next local day", () => {
    expect(nextDailySleepSummaryDate(new Date(2026, 7, 24, 20), "20:00"))
      .toEqual(new Date(2026, 7, 25, 20));
    expect(nextDailySleepSummaryDate(new Date(2026, 7, 24, 12), "invalid")).toBeNull();
  });

  it("replaces the stable daily schedule after time or locale changes and cancels it when disabled", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    storage.set(SLEEP_SUMMARY_TIME_KEY, "21:30");
    await reconcileDailySleepSummary({
      summary: summary(),
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "es",
      now: new Date(2026, 7, 24, 12),
    });
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: DAILY_SLEEP_SUMMARY_NOTIFICATION_ID,
      content: expect.objectContaining({ body: expect.stringContaining("Las siestas promediaron") }),
      trigger: expect.objectContaining({ date: new Date(2026, 7, 24, 21, 30) }),
    }));

    await saveDailySleepSummaryPreference({
      enabled: false,
      time: "21:30",
      summary: summary(),
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "es",
    });
    expect(storage.get(SLEEP_SUMMARY_ENABLED_KEY)).toBe("false");
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenLastCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
  });

  it("cancels the pending summary when notification permission is revoked", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    storage.set(SLEEP_SUMMARY_TIME_KEY, "20:00");
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: "never",
      status: Notifications.PermissionStatus.DENIED,
    });

    await reconcileDailySleepSummary({
      summary: summary(),
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    });

    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("clears both sleep notification preferences and pending identifiers at sign-out", async () => {
    storage.set(SLEEP_SUMMARY_ENABLED_KEY, "true");
    storage.set(SLEEP_SUMMARY_TIME_KEY, "20:00");
    storage.set(TRANSITION_UPDATES_ENABLED_KEY, "true");
    storage.set(LAST_TRANSITION_EVENT_KEY, "event-1");

    await clearSleepNotificationState();

    expect(storage.size).toBe(0);
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith(DAILY_SLEEP_SUMMARY_NOTIFICATION_ID);
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith("babyflow-sleep-transition-event-1");
  });

  it("builds concise summary content without inventing a reference", () => {
    expect(dailySleepSummaryContent({
      summary: { ...summary(), references: [] },
      profile: { name: "Luna", dateOfBirth: "2026-02-23" },
      locale: "en",
    }).body).not.toContain("Reference:");
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
});
