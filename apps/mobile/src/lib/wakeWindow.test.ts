import { describe, expect, it } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import type { BabyProfile } from "../types/profile";
import { decideSleepReminder, wakeWindowRecommendation, type SleepReminderRecord } from "./wakeWindow";

const now = new Date(2026, 7, 22, 12);
const profile: BabyProfile = { name: "Leo", dateOfBirth: "2026-05-22" };

function event(id: string, type: EventType, occurredAt: Date): BabyEvent {
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

function decide(overrides: Partial<Parameters<typeof decideSleepReminder>[0]> = {}) {
  return decideSleepReminder({
    enabled: true,
    native: true,
    profile,
    events: [event("wake", "wake_up", new Date(2026, 7, 22, 11))],
    thresholdOverrideMinutes: null,
    locale: "en",
    record: null,
    now,
    ...overrides,
  });
}

describe("wake-window recommendations", () => {
  it.each([
    ["2026-08-22", { minMinutes: 30, maxMinutes: 60 }],
    ["2026-07-22", { minMinutes: 60, maxMinutes: 120 }],
    ["2026-05-22", { minMinutes: 75, maxMinutes: 150 }],
    ["2026-03-22", { minMinutes: 120, maxMinutes: 240 }],
    ["2026-01-22", { minMinutes: 150, maxMinutes: 270 }],
    ["2025-10-22", { minMinutes: 180, maxMinutes: 360 }],
    ["2025-08-22", null],
  ])("uses the correct range at the %s boundary", (dateOfBirth, expected) => {
    expect(wakeWindowRecommendation(dateOfBirth, now)).toEqual(expected);
  });
});

describe("sleep reminder decisions", () => {
  it("cancels for disabled, unavailable, sleeping, and missing wake states", () => {
    expect(decide({ enabled: false })).toMatchObject({ kind: "cancel", reason: "disabled" });
    expect(decide({ native: false })).toMatchObject({ kind: "cancel", reason: "unavailable" });
    expect(decide({ events: [] })).toMatchObject({ kind: "cancel", reason: "no-wake" });
    expect(decide({ events: [event("sleep", "sleep", new Date(2026, 7, 22, 11))] })).toMatchObject({ kind: "cancel", reason: "sleeping" });
  });

  it("schedules at the recommendation minimum for a future wake target", () => {
    const decision = decide();
    expect(decision).toMatchObject({ kind: "schedule", overdue: false });
    if (decision.kind === "schedule") {
      expect(decision.targetAt).toEqual(new Date(2026, 7, 22, 12, 15));
      expect(decision.scheduleAt).toEqual(decision.targetAt);
    }
  });

  it("schedules an overdue wake once at the next feasible time", () => {
    const decision = decide({ events: [event("wake", "wake_up", new Date(2026, 7, 22, 8))] });
    expect(decision).toMatchObject({ kind: "schedule", overdue: true });
    if (decision.kind === "schedule") expect(decision.scheduleAt).toEqual(new Date(now.getTime() + 1_000));
  });

  it("does not repeat an already handled overdue wake after a language change", () => {
    const wake = event("wake", "wake_up", new Date(2026, 7, 22, 8));
    const record: SleepReminderRecord = {
      wakeId: wake.id,
      targetAt: new Date(2026, 7, 22, 9, 15).toISOString(),
      thresholdMinutes: 75,
      locale: "en",
      profileName: "Leo",
      dateOfBirth: profile.dateOfBirth,
    };
    expect(decide({ events: [wake], locale: "es", record })).toMatchObject({ kind: "keep", handled: true });
  });

  it("reschedules a pending target when language, profile, threshold, or source event changes", () => {
    const first = decide();
    if (first.kind !== "schedule") throw new Error("Expected schedule decision");
    expect(decide({ locale: "es", record: first.record })).toMatchObject({ kind: "schedule" });
    expect(decide({ profile: { ...profile, name: "Lía" }, record: first.record })).toMatchObject({ kind: "schedule" });
    expect(decide({ thresholdOverrideMinutes: 90, record: first.record })).toMatchObject({ kind: "schedule" });
    expect(decide({ events: [event("wake-edited", "wake_up", new Date(2026, 7, 22, 11))], record: first.record })).toMatchObject({ kind: "schedule" });
  });

  it("uses the resulting latest phase after the scheduling source is deleted", () => {
    const events = [
      event("older-wake", "wake_up", new Date(2026, 7, 22, 9)),
      event("sleep", "sleep", new Date(2026, 7, 22, 10)),
    ];
    expect(decide({ events })).toMatchObject({ kind: "cancel", reason: "sleeping" });
  });

  it("requires a custom threshold at 12 months and accepts an override", () => {
    const older = { name: "Leo", dateOfBirth: "2025-08-22" };
    expect(decide({ profile: older })).toMatchObject({ kind: "cancel", reason: "custom-required" });
    expect(decide({ profile: older, thresholdOverrideMinutes: 180 })).toMatchObject({ kind: "schedule" });
  });
});
