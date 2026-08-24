import { describe, expect, it } from "vitest";
import { ageParts, completedAgeMonths, parseCalendarDate, validateBabyProfile } from "./profile";

describe("calendar-date profiles", () => {
  it("parses dates using local calendar parts and rejects invalid dates", () => {
    expect(parseCalendarDate("2024-02-29")).toEqual(new Date(2024, 1, 29));
    expect(parseCalendarDate("2025-02-29")).toBeNull();
    expect(parseCalendarDate("2026-2-03")).toBeNull();
  });

  it("validates required, overlong, invalid, and future values", () => {
    const now = new Date(2026, 7, 22, 23, 30);
    expect(validateBabyProfile({ name: "   ", dateOfBirth: "" }, now)).toEqual({
      name: "required",
      dateOfBirth: "required",
    });
    expect(validateBabyProfile({ name: "a".repeat(81), dateOfBirth: "2026-02-30" }, now)).toEqual({
      name: "too_long",
      dateOfBirth: "invalid",
    });
    expect(validateBabyProfile({ name: "Leo", dateOfBirth: "2026-08-23" }, now)).toEqual({
      dateOfBirth: "future",
    });
  });

  it("calculates newborn and completed months across month ends", () => {
    expect(completedAgeMonths("2026-08-22", new Date(2026, 7, 22, 23, 59))).toBe(0);
    expect(completedAgeMonths("2026-01-31", new Date(2026, 1, 27))).toBe(0);
    expect(completedAgeMonths("2026-01-31", new Date(2026, 1, 28))).toBe(1);
  });

  it("handles leap-day anniversaries and year/month display parts", () => {
    expect(completedAgeMonths("2024-02-29", new Date(2025, 1, 27))).toBe(11);
    expect(completedAgeMonths("2024-02-29", new Date(2025, 1, 28))).toBe(12);
    expect(ageParts("2025-06-22", new Date(2026, 7, 22))).toEqual({
      years: 1,
      months: 2,
      totalMonths: 14,
    });
  });

  it("rejects future dates before calculating age", () => {
    expect(() => completedAgeMonths("2026-08-23", new Date(2026, 7, 22))).toThrow("INVALID_BABY_DATE_OF_BIRTH");
  });
});
