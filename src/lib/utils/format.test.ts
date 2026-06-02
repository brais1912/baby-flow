import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatDate,
  formatSleepDuration,
  eventTypeLabel,
  diaperTypeLabel,
  sleepMethodLabel,
} from "./format";

describe("formatTime", () => {
  it("formats time as HH:mm", () => {
    const date = new Date("2024-01-15T08:30:00");
    expect(formatTime(date)).toBe("08:30");
  });

  it("pads single-digit hours", () => {
    const date = new Date("2024-01-15T03:05:00");
    expect(formatTime(date)).toBe("03:05");
  });
});

describe("formatDate", () => {
  it("formats date as month day, year", () => {
    const date = new Date("2024-01-15T00:00:00");
    expect(formatDate(date)).toBe("Jan 15, 2024");
  });
});

describe("formatSleepDuration", () => {
  it("returns formatted duration between two dates", () => {
    const start = new Date("2024-01-15T20:00:00");
    const end = new Date("2024-01-16T02:30:00");
    expect(formatSleepDuration(start, end)).toBe("6 hours 30 minutes");
  });

  it("handles exactly 1 hour", () => {
    const start = new Date("2024-01-15T20:00:00");
    const end = new Date("2024-01-15T21:00:00");
    expect(formatSleepDuration(start, end)).toBe("1 hour");
  });
});

describe("eventTypeLabel", () => {
  it("returns correct label for each event type", () => {
    expect(eventTypeLabel("sleep")).toBe("Sleep");
    expect(eventTypeLabel("feeding")).toBe("Feeding");
    expect(eventTypeLabel("diaper")).toBe("Diaper");
  });
});

describe("diaperTypeLabel", () => {
  it("returns correct label for each diaper type", () => {
    expect(diaperTypeLabel("pee")).toBe("Pee");
    expect(diaperTypeLabel("poop")).toBe("Poop");
    expect(diaperTypeLabel("both")).toBe("Pee & Poop");
  });
});

describe("sleepMethodLabel", () => {
  it("returns correct label for each sleep method", () => {
    expect(sleepMethodLabel("pacifier")).toBe("Pacifier");
    expect(sleepMethodLabel("held")).toBe("Being held");
    expect(sleepMethodLabel("self")).toBe("Self-soothing");
  });
});
