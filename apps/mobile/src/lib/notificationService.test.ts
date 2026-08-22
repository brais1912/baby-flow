import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BabyEvent } from "../types/events";
import {
  DAILY_ENABLED_KEY,
  DAILY_NOTIFICATION_ID,
  DAILY_TIME_KEY,
  SLEEP_NOTIFICATION_ID,
  reconcileSleepReminder,
  rescheduleDailyReminder,
} from "./notificationService";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  platform: vi.fn(() => "ios"),
  checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
  requestPermissions: vi.fn().mockResolvedValue({ display: "granted" }),
  cancel: vi.fn().mockResolvedValue(undefined),
  removeDelivered: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue({ notifications: [] }),
  getPending: vi.fn().mockResolvedValue({ notifications: [{ id: 1002 }] }),
  exact: vi.fn().mockResolvedValue({ exact_alarm: "granted" }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: mocks.platform,
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    cancel: mocks.cancel,
    removeDeliveredNotificationsById: mocks.removeDelivered,
    schedule: mocks.schedule,
    getPending: mocks.getPending,
    checkExactNotificationSetting: mocks.exact,
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: mocks.values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      mocks.values.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      mocks.values.delete(key);
    }),
  },
}));

function wakeEvent(): BabyEvent {
  const occurredAt = new Date(2026, 7, 22, 11);
  return {
    id: "wake-1",
    userId: "user-1",
    type: "wake_up",
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("notificationService", () => {
  beforeEach(() => {
    mocks.values.clear();
    mocks.platform.mockReturnValue("ios");
    mocks.checkPermissions.mockResolvedValue({ display: "granted" });
    mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
    vi.clearAllMocks();
  });

  it("reschedules pending sleep content in another language without changing its timestamp", async () => {
    const input: Parameters<typeof reconcileSleepReminder>[0] = {
      preferences: { enabled: true, thresholdOverrideMinutes: null },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    };
    await reconcileSleepReminder({ ...input, locale: "en" });
    const english = mocks.schedule.mock.calls[0]?.[0].notifications[0];
    await reconcileSleepReminder({ ...input, locale: "es" });
    const spanish = mocks.schedule.mock.calls[1]?.[0].notifications[0];

    expect(english.id).toBe(SLEEP_NOTIFICATION_ID);
    expect(spanish.id).toBe(SLEEP_NOTIFICATION_ID);
    expect(spanish.schedule.at).toEqual(english.schedule.at);
    expect(spanish.body).toContain("Leo lleva despierto");
    expect(mocks.cancel.mock.calls.every(([request]) => request.notifications[0].id === SLEEP_NOTIFICATION_ID)).toBe(true);
    expect(mocks.cancel.mock.calls.some(([request]) => request.notifications[0].id === DAILY_NOTIFICATION_ID)).toBe(false);
  });

  it("translates the daily reminder while preserving its recurring time", async () => {
    mocks.values.set(DAILY_ENABLED_KEY, "true");
    mocks.values.set(DAILY_TIME_KEY, "20:15");
    await rescheduleDailyReminder("es");
    expect(mocks.schedule).toHaveBeenCalledWith({ notifications: [{
      id: DAILY_NOTIFICATION_ID,
      title: "Recordatorio de BabyFlow",
      body: "Abre BabyFlow para registrar el último evento.",
      schedule: { on: { hour: 20, minute: 15 }, repeats: true },
    }] });
  });

  it("deduplicates a pending wake period and restores it when the OS request is missing", async () => {
    const input: Parameters<typeof reconcileSleepReminder>[0] = {
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    };
    await reconcileSleepReminder(input);
    const kept = await reconcileSleepReminder(input);
    expect(kept.decision.kind).toBe("keep");
    expect(mocks.schedule).toHaveBeenCalledOnce();

    mocks.getPending.mockResolvedValueOnce({ notifications: [] });
    const restored = await reconcileSleepReminder(input);
    expect(restored.decision.kind).toBe("schedule");
    expect(mocks.schedule).toHaveBeenCalledTimes(2);
  });

  it("cancels without scheduling when notification permission is denied", async () => {
    mocks.checkPermissions.mockResolvedValue({ display: "denied" });
    const result = await reconcileSleepReminder({
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    });
    expect(result.permissionDenied).toBe(true);
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: SLEEP_NOTIFICATION_ID }] });
  });

  it("cancels pending and delivered guidance after sleep starts", async () => {
    const sleepEvent = {
      ...wakeEvent(),
      id: "sleep-1",
      type: "sleep" as const,
      occurredAt: new Date(2026, 7, 22, 12, 15),
    };
    const result = await reconcileSleepReminder({
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent(), sleepEvent],
      locale: "en",
      now: new Date(2026, 7, 22, 12, 30),
    });
    expect(result.decision).toEqual({ kind: "cancel", reason: "sleeping" });
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: SLEEP_NOTIFICATION_ID }] });
    expect(mocks.removeDelivered).toHaveBeenCalledWith({ ids: [SLEEP_NOTIFICATION_ID] });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("reports Android inexact-alarm state without changing the scheduled reminder", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
    const result = await reconcileSleepReminder({
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    });
    expect(result.inexactAndroid).toBe(true);
    expect(mocks.schedule).toHaveBeenCalledOnce();
  });
});
