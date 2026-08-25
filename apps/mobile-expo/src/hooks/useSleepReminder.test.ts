import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSleepReminder,
  loadSleepReminderPreferences,
  reconcileSleepReminder,
} from "../lib/notificationService";
import type { BabyEvent, EventType } from "../types/events";
import { useSleepReminder } from "./useSleepReminder";

vi.mock("../lib/notificationService", () => ({
  cancelSleepReminder: vi.fn().mockResolvedValue(undefined),
  isNativePlatform: vi.fn(() => true),
  loadSleepReminderPreferences: vi.fn().mockResolvedValue({
    enabled: true,
    thresholdOverrideMinutes: null,
  }),
  notificationPermission: vi.fn().mockResolvedValue(true),
  reconcileSleepReminder: vi.fn(),
  storeSleepReminderPreferences: vi.fn().mockResolvedValue(undefined),
}));

describe("useSleepReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSleepReminderPreferences).mockResolvedValue({
      enabled: true,
      thresholdOverrideMinutes: null,
    });
  });

  it("keeps a persisted native reminder scheduled when the React view unmounts", async () => {
    const { result, unmount } = renderHook(() => useSleepReminder({
      profile: { name: "Luna", dateOfBirth: "2026-02-01" },
      event: null,
      ready: false,
    }));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    unmount();

    expect(cancelSleepReminder).not.toHaveBeenCalled();
  });

  it("reconciles phase changes in order so an older response cannot win", async () => {
    let resolveFirst: ((value: Awaited<ReturnType<typeof reconcileSleepReminder>>) => void) | undefined;
    const first = new Promise<Awaited<ReturnType<typeof reconcileSleepReminder>>>((resolve) => {
      resolveFirst = resolve;
    });
    vi.mocked(reconcileSleepReminder)
      .mockImplementationOnce(() => first)
      .mockResolvedValue({
        decision: { kind: "cancel", reason: "no-wake" },
        permissionDenied: false,
        inexactAndroid: false,
      });
    const sleep = phaseEvent("sleep-1", "sleep");
    const wake = phaseEvent("wake-1", "wake_up");
    const profile = { name: "Luna", dateOfBirth: "2026-02-01" };
    const { rerender } = renderHook(
      ({ event }: { event: BabyEvent }) => useSleepReminder({
        profile,
        event,
        ready: true,
      }),
      { initialProps: { event: sleep } }
    );
    await waitFor(() => expect(reconcileSleepReminder).toHaveBeenCalledOnce());

    rerender({ event: wake });
    expect(reconcileSleepReminder).toHaveBeenCalledOnce();
    await act(async () => {
      if (!resolveFirst) throw new Error("DEFERRED_NOT_READY");
      resolveFirst({
        decision: { kind: "cancel", reason: "sleeping" },
        permissionDenied: false,
        inexactAndroid: false,
      });
      await first;
    });

    await waitFor(() => expect(reconcileSleepReminder).toHaveBeenCalledTimes(2));
    expect(reconcileSleepReminder).toHaveBeenLastCalledWith(expect.objectContaining({
      events: [wake],
    }));
  });
});

function phaseEvent(id: string, type: EventType): BabyEvent {
  const occurredAt = new Date();
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
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}
