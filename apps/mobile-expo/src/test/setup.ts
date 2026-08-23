import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  getPermissionsAsync: vi.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  cancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: vi.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: vi.fn().mockResolvedValue("test-notification"),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
}));

vi.mock("react-native-safe-area-context", async () => {
  const native = await import("react-native");
  return {
    SafeAreaProvider: native.View,
    SafeAreaView: native.View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

vi.mock("@react-native-community/datetimepicker", () => ({
  default: () => null,
}));

afterEach(() => cleanup());
