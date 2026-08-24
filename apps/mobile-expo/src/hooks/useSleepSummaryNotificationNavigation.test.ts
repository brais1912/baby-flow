import { renderHook, waitFor } from "@testing-library/react";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSleepSummaryNotificationNavigation } from "./useSleepSummaryNotificationNavigation";

function response(ownerDate: string): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date: 0,
      request: {
        identifier: "1101",
        trigger: null,
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          data: { type: "sleep-summary", ownerDate },
        },
      },
    },
  };
}

describe("useSleepSummaryNotificationNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null);
    vi.mocked(Linking.getInitialURL).mockResolvedValue(null);
  });

  it("opens the exact owner day from the destination URL", () => {
    const onOpen = vi.fn();
    renderHook(() => useSleepSummaryNotificationNavigation(onOpen));
    const listener = vi.mocked(Linking.addEventListener).mock.calls[0]?.[1];
    if (!listener) throw new Error("Expected a URL listener");

    listener({ url: "com.babyflow.app://insights/sleep/2026-08-21" });

    expect(onOpen).toHaveBeenCalledWith(new Date(2026, 7, 21));
  });

  it("opens the exact owner day from a live notification tap", () => {
    const onOpen = vi.fn();
    renderHook(() => useSleepSummaryNotificationNavigation(onOpen));
    const listener = vi.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0]?.[0];
    if (!listener) throw new Error("Expected a notification response listener");

    listener(response("2026-08-23"));

    expect(onOpen).toHaveBeenCalledWith(new Date(2026, 7, 23));
  });

  it("opens and consumes the owner day that launched the app", async () => {
    vi.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(response("2026-08-22"));
    const onOpen = vi.fn();
    renderHook(() => useSleepSummaryNotificationNavigation(onOpen));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(new Date(2026, 7, 22)));
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledOnce();
  });
});
