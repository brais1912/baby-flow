import { ageParts } from "../lib/profile";
import type { Locale } from "./messages";
import { translate } from "./messages";

function unit(locale: Locale, count: number, one: "profile.monthOne" | "profile.yearOne", many: "profile.monthMany" | "profile.yearMany"): string {
  return translate(locale, new Intl.PluralRules(locale).select(count) === "one" ? one : many);
}

export function formatAge(dateOfBirth: string, locale: Locale, now = new Date()): string {
  const age = ageParts(dateOfBirth, now);
  if (age.totalMonths === 0) return translate(locale, "profile.ageNewborn");
  if (age.years === 0) {
    return translate(locale, "profile.ageMonths", {
      count: age.months,
      unit: unit(locale, age.months, "profile.monthOne", "profile.monthMany"),
    });
  }
  if (age.months === 0) {
    return translate(locale, "profile.ageMonths", {
      count: age.years,
      unit: unit(locale, age.years, "profile.yearOne", "profile.yearMany"),
    });
  }
  return translate(locale, "profile.ageYearsMonths", {
    years: age.years,
    yearUnit: unit(locale, age.years, "profile.yearOne", "profile.yearMany"),
    months: age.months,
    monthUnit: unit(locale, age.months, "profile.monthOne", "profile.monthMany"),
  });
}

export function formatMinutesDuration(minutes: number, locale: Locale): string {
  if (minutes < 60 || minutes % 60 !== 0) return translate(locale, "sleepReminder.durationMinutes", { count: minutes });
  const hours = minutes / 60;
  return translate(locale, "sleepReminder.durationHours", {
    count: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(hours),
  });
}

export function formatSleepChartDuration(hours: number, locale: Locale): string {
  if (!Number.isFinite(hours) || hours <= 0) return "";
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
  return locale === "es" ? `${value} h` : `${value}h`;
}

export function formatEventDuration(durationMs: number, locale: Locale): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  if (totalMinutes === 0) return translate(locale, "duration.lessThanMinute");
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return translate(locale, "duration.minutes", { count: minutes });
  if (minutes === 0) return translate(locale, "duration.hours", { count: hours });
  return translate(locale, "duration.hoursMinutes", { hours, minutes });
}
