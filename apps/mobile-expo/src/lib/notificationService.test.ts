import * as Notifications from "expo-notifications";
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
    storage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(platform, "currentPlatform").mockReturnValue("ios");
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true, expires: "never", status: Notifications.PermissionStatus.GRANTED });
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
    vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue("scheduled");
  });

  it("translates the daily reminder while preserving its recurring time", async () => {
    storage.set(DAILY_ENABLED_KEY, "true");
    storage.set(DAILY_TIME_KEY, "20:15");
    await rescheduleDailyReminder("es");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: DAILY_NOTIFICATION_ID,
      content: expect.objectContaining({
        title: "Recordatorio de BabyFlow",
        body: "Abre BabyFlow para registrar el último evento.",
      }),
      trigger: expect.objectContaining({ hour: 20, minute: 15, type: "daily" }),
    }));
  });

  it("schedules one stable reminder for a wake period and then keeps it", async () => {
    const input: Parameters<typeof reconcileSleepReminder>[0] = {
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    };
    const scheduled = await reconcileSleepReminder(input);
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([{
      identifier: SLEEP_NOTIFICATION_ID,
      content: { title: "", subtitle: null, body: "", data: {}, sound: null, categoryIdentifier: null },
      trigger: null,
    }]);
    const kept = await reconcileSleepReminder(input);
    expect(scheduled.decision.kind).toBe("schedule");
    expect(kept.decision.kind).toBe("keep");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledOnce();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: SLEEP_NOTIFICATION_ID }));
  });

  it("cancels without scheduling when notification permission is denied", async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false, expires: "never", status: Notifications.PermissionStatus.DENIED });
    const result = await reconcileSleepReminder({
      preferences: { enabled: true, thresholdOverrideMinutes: 90 },
      profile: { name: "Leo", dateOfBirth: "2026-05-22" },
      events: [wakeEvent()],
      locale: "en",
      now: new Date(2026, 7, 22, 12),
    });
    expect(result.permissionDenied).toBe(true);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(SLEEP_NOTIFICATION_ID);
  });
});
