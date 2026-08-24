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
    onSwipeableWillOpen?: (direction: "left" | "right") => void;
    onSwipeableOpen?: (direction: "left" | "right") => void;
    onSwipeableClose?: (direction: "left" | "right") => void;
    renderLeftActions?: (
      progress: { value: number },
      translation: { value: number },
      methods: MockMethods
    ) => ReactNode;
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
    renderLeftActions,
    renderRightActions,
  }, ref) {
    const [openSide, setOpenSide] = React.useState<"left" | "right" | null>(null);
    const methods = React.useMemo<MockMethods>(() => ({
      close: () => {
        setOpenSide(null);
        onSwipeableClose?.("left");
      },
      openLeft: () => {
        if (!enabled) return;
        onSwipeableWillOpen?.("right");
        setOpenSide("left");
        onSwipeableOpen?.("right");
      },
      openRight: () => {
        if (!enabled) return;
        onSwipeableWillOpen?.("left");
        setOpenSide("right");
        onSwipeableOpen?.("left");
      },
      reset: () => setOpenSide(null),
    }), [enabled, onSwipeableClose, onSwipeableOpen, onSwipeableWillOpen]);
    React.useImperativeHandle(ref, () => methods, [methods]);

    return React.createElement(
      native.View,
      { testID },
      React.createElement(native.Pressable, {
        "aria-hidden": true,
        testID: testID ? `${testID}-swipe-right` : undefined,
        onPress: methods.openLeft,
      }),
      React.createElement(native.Pressable, {
        "aria-hidden": true,
        testID: testID ? `${testID}-swipe-left` : undefined,
        onPress: methods.openRight,
      }),
      children,
      openSide === "left" && renderLeftActions
        ? renderLeftActions({ value: 1 }, { value: 82 }, methods)
        : null,
      openSide === "right" && renderRightActions
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
