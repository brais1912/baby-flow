import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DailySleepSummary } from "../lib/sleepInsights";
import {
  loadSleepNotificationPreferences,
  saveDailySleepSummaryPreference,
  saveTransitionUpdatesPreference,
} from "../lib/sleepNotificationService";
import { ReminderPanel } from "./ReminderPanel";

vi.mock("../lib/sleepNotificationService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/sleepNotificationService")>();
  return {
    ...original,
    loadSleepNotificationPreferences: vi.fn(),
    saveDailySleepSummaryPreference: vi.fn().mockResolvedValue(undefined),
    saveTransitionUpdatesPreference: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../lib/notificationService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/notificationService")>();
  return {
    ...original,
    isNativePlatform: () => true,
    loadDailyReminderPreferences: vi.fn().mockResolvedValue({ enabled: false, time: "20:00" }),
  };
});

function summary(): DailySleepSummary {
  return {
    ownerDate: new Date(2026, 7, 23),
    windowStart: new Date(2026, 7, 23, 12),
    windowEnd: new Date(2026, 7, 24, 12),
    totalSleepMinutes: 720,
    daytimeSleepMinutes: 60,
    nighttimeSleepMinutes: 660,
    daytimeSessionCount: 1,
    nighttimeSessionCount: 2,
    daytimeAverageMinutes: 60,
    nighttimeAverageMinutes: 240,
    nightWakings: 1,
    longestSleepMinutes: 300,
    completePairCount: 3,
    excludedUnmatchedCount: 0,
    ageMonthsAtWindowEnd: 6,
    references: [],
  };
}

const sleepReminder = {
  loaded: true,
  saving: false,
  enabled: false,
  thresholdOverrideMinutes: null,
  recommendation: { minMinutes: 90, maxMinutes: 120 },
  result: null,
  error: null,
  save: vi.fn().mockResolvedValue(true),
  reconcile: vi.fn().mockResolvedValue(undefined),
};

const sleepInsights = {
  summaries: [summary(), { ...summary(), ownerDate: new Date(2026, 7, 22) }],
  events: [],
  latestOwnerDate: new Date(2026, 7, 23),
  startMinutes: 720,
  loading: false,
  error: false,
  reload: vi.fn().mockResolvedValue(undefined),
};

describe("ReminderPanel sleep notifications", () => {
  it("loads both new opt-in settings disabled and saves them independently", async () => {
    vi.mocked(loadSleepNotificationPreferences).mockResolvedValue({
      summaryEnabled: false,
      summaryTime: "20:00",
      transitionEnabled: false,
    });
    const user = userEvent.setup();
    render(
      <ReminderPanel
        profile={{ name: "Luna", dateOfBirth: "2026-02-23" }}
        sleepReminder={sleepReminder}
        sleepInsights={sleepInsights}
      />
    );

    await waitFor(() => expect(screen.getByRole("switch", { name: "Daily sleep summary" })).not.toBeChecked());
    expect(screen.getByRole("switch", { name: "Sleep/wake duration updates" })).not.toBeChecked();

    await user.click(screen.getByRole("switch", { name: "Daily sleep summary" }));
    await user.click(screen.getByRole("button", { name: "Save daily sleep summary" }));
    expect(saveDailySleepSummaryPreference).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, time: "20:00" }));

    await user.click(screen.getByRole("switch", { name: "Sleep/wake duration updates" }));
    await user.click(screen.getByRole("button", { name: "Save duration updates" }));
    expect(saveTransitionUpdatesPreference).toHaveBeenCalledWith(true);
  });
});
