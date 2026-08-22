import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { useSleepReminder } from "../hooks/useSleepReminder";
import { ReminderPanel } from "./ReminderPanel";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: mocks.values.get(key) ?? null })),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

function controller(overrides: Partial<ReturnType<typeof useSleepReminder>> = {}): ReturnType<typeof useSleepReminder> {
  return {
    loaded: true,
    saving: false,
    enabled: false,
    thresholdOverrideMinutes: null,
    recommendation: { minMinutes: 75, maxMinutes: 150 },
    result: null,
    error: null,
    save: vi.fn().mockResolvedValue(true),
    reconcile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ReminderPanel", () => {
  beforeEach(() => {
    mocks.values.clear();
  });

  it("shows the age recommendation, disclaimer, and next alert state", () => {
    const wake = new Date(2026, 7, 22, 10, 15);
    render(
      <ReminderPanel
        profile={{ name: "Leo", dateOfBirth: "2026-05-22" }}
        sleepReminder={controller({
          enabled: true,
          result: {
            decision: {
              kind: "schedule",
              wake: {
                id: "wake-1",
                userId: "user-1",
                type: "wake_up",
                occurredAt: wake,
                notes: null,
                sleepMethod: null,
                sleepCondition: null,
                sleepRoomTemperature: null,
                feedingType: null,
                feedingAmountMl: null,
                feedingDurationMinutes: null,
                diaperType: null,
                createdAt: wake,
                updatedAt: wake,
              },
              targetAt: new Date(2026, 7, 22, 11, 30),
              scheduleAt: new Date(2026, 7, 22, 11, 30),
              overdue: false,
              record: {
                wakeId: "wake-1",
                targetAt: new Date(2026, 7, 22, 11, 30).toISOString(),
                thresholdMinutes: 75,
                locale: "en",
                profileName: "Leo",
                dateOfBirth: "2026-05-22",
              },
            },
            permissionDenied: false,
            inexactAndroid: false,
          },
        })}
      />
    );
    expect(screen.getByText("Current age: 3 months")).toBeInTheDocument();
    expect(screen.getByText("Typical wake window: 75–150 minutes")).toBeInTheDocument();
    expect(screen.getByText("Awake since 10:15")).toBeInTheDocument();
    expect(screen.getByText("Next reminder around 11:30")).toBeInTheDocument();
    expect(screen.getByText(/guidance, not a prescription/i)).toBeInTheDocument();
  });

  it("requires a custom interval for babies 12 months or older", async () => {
    const user = userEvent.setup();
    const sleep = controller({ recommendation: null });
    render(<ReminderPanel profile={{ name: "Leo", dateOfBirth: "2025-08-22" }} sleepReminder={sleep} />);
    const card = screen.getByText("Sleep window reminder").closest("section");
    if (!card) throw new Error("Sleep reminder card missing");
    await user.click(within(card).getByRole("checkbox"));
    await user.click(within(card).getByRole("button", { name: "Save sleep reminder" }));
    expect(screen.getByText("Choose a custom interval for babies 12 months or older.")).toBeInTheDocument();
    expect(sleep.save).not.toHaveBeenCalled();
  });

  it("validates custom intervals and still allows an older-baby reminder to be disabled", async () => {
    const user = userEvent.setup();
    const sleep = controller({ enabled: true, recommendation: null, thresholdOverrideMinutes: 90 });
    render(<ReminderPanel profile={{ name: "Leo", dateOfBirth: "2025-08-22" }} sleepReminder={sleep} />);
    const card = screen.getByText("Sleep window reminder").closest("section");
    if (!card) throw new Error("Sleep reminder card missing");
    const interval = within(card).getByRole("spinbutton");
    await user.clear(interval);
    await user.type(interval, "17");
    await user.click(within(card).getByRole("button", { name: "Save sleep reminder" }));
    expect(screen.getByText("Choose 15–720 minutes in 15-minute increments.")).toBeInTheDocument();
    expect(sleep.save).not.toHaveBeenCalled();

    await user.click(within(card).getByRole("checkbox"));
    await user.click(within(card).getByRole("button", { name: "Save sleep reminder" }));
    expect(sleep.save).toHaveBeenCalledWith(false, 90);
  });

  it("surfaces native permission availability errors", () => {
    render(
      <ReminderPanel
        profile={{ name: "Leo", dateOfBirth: "2026-05-22" }}
        sleepReminder={controller({ error: "permission" })}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("installed Android and iOS apps");
  });
});
