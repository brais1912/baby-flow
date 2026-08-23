import { describe, expect, it } from "vitest";
import { formatAge, formatEventDuration, formatSleepChartDuration } from "./format";

describe("formatAge", () => {
  it("formats singular and plural ages without Intl.PluralRules", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "PluralRules");
    Object.defineProperty(Intl, "PluralRules", { configurable: true, value: undefined });

    try {
      expect(formatAge("2026-07-23", "en", new Date(2026, 7, 23))).toBe("1 month");
      expect(formatAge("2026-06-23", "es", new Date(2026, 7, 23))).toBe("2 meses");
    } finally {
      if (descriptor) Object.defineProperty(Intl, "PluralRules", descriptor);
    }
  });
});

describe("formatSleepChartDuration", () => {
  it("formats compact English and Spanish sleep totals", () => {
    expect(formatSleepChartDuration(1.5, "en")).toBe("1.5h");
    expect(formatSleepChartDuration(1.5, "es")).toBe("1,5 h");
    expect(formatSleepChartDuration(12, "en")).toBe("12h");
  });

  it("suppresses zero, negative, and invalid values", () => {
    expect(formatSleepChartDuration(0, "en")).toBe("");
    expect(formatSleepChartDuration(-1, "en")).toBe("");
    expect(formatSleepChartDuration(Number.NaN, "en")).toBe("");
  });
});

describe("formatEventDuration", () => {
  it("formats sub-minute, minute, hour, and mixed durations", () => {
    expect(formatEventDuration(30_000, "en")).toBe("< 1 min");
    expect(formatEventDuration(30 * 60_000, "en")).toBe("30 min");
    expect(formatEventDuration(2 * 60 * 60_000, "en")).toBe("2h");
    expect(formatEventDuration(90 * 60_000, "es")).toBe("1 h 30 min");
  });

  it("suppresses negative and invalid durations", () => {
    expect(formatEventDuration(-1, "en")).toBe("");
    expect(formatEventDuration(Number.NaN, "en")).toBe("");
  });
});
