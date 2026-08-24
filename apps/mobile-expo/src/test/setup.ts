import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

vi.mock("react-native-gesture-handler/ReanimatedSwipeable", async () => {
  const React = await import("react");
  const native = await import("react-native");

  type MockMethods = {
    close: () => void;
    openLeft: () => void;
    openRight: () => void;
    reset: () => void;
  };
  type MockProps = {
    children?: ReactNode;
    enabled?: boolean;
    testID?: string;
    onSwipeableWillOpen?: (direction: "right") => void;
    onSwipeableOpen?: (direction: "right") => void;
    onSwipeableClose?: (direction: "right") => void;
    renderRightActions?: (
      progress: { value: number },
      translation: { value: number },
      methods: MockMethods
    ) => ReactNode;
  };

  const MockSwipeable = React.forwardRef<MockMethods, MockProps>(function MockSwipeable({
    children,
    enabled = true,
    testID,
    onSwipeableWillOpen,
    onSwipeableOpen,
    onSwipeableClose,
    renderRightActions,
  }, ref) {
    const [open, setOpen] = React.useState(false);
    const methods = React.useMemo<MockMethods>(() => ({
      close: () => {
        setOpen(false);
        onSwipeableClose?.("right");
      },
      openLeft: () => undefined,
      openRight: () => {
        if (!enabled) return;
        onSwipeableWillOpen?.("right");
        setOpen(true);
        onSwipeableOpen?.("right");
      },
      reset: () => setOpen(false),
    }), [enabled, onSwipeableClose, onSwipeableOpen, onSwipeableWillOpen]);
    React.useImperativeHandle(ref, () => methods, [methods]);

    return React.createElement(
      native.View,
      { testID },
      React.createElement(native.Pressable, {
        "aria-hidden": true,
        testID: testID ? `${testID}-open` : undefined,
        onPress: methods.openRight,
      }),
      children,
      open && renderRightActions
        ? renderRightActions({ value: 1 }, { value: -82 }, methods)
        : null
    );
  });

  return { default: MockSwipeable };
});

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
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  getLastNotificationResponseAsync: vi.fn().mockResolvedValue(null),
  clearLastNotificationResponseAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("expo-linking", () => ({
  openURL: vi.fn().mockResolvedValue(undefined),
  getInitialURL: vi.fn().mockResolvedValue(null),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
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
