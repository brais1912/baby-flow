import type { BabyProfile, ProfileValidationErrors } from "../types/profile";

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function localToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function validateBabyProfile(
  profile: BabyProfile,
  now = new Date()
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const name = profile.name.trim();
  if (!name) errors.name = "required";
  else if (name.length > 80) errors.name = "too_long";

  if (!profile.dateOfBirth) {
    errors.dateOfBirth = "required";
  } else {
    const birth = parseCalendarDate(profile.dateOfBirth);
    if (!birth) errors.dateOfBirth = "invalid";
    else if (birth > localToday(now)) errors.dateOfBirth = "future";
  }
  return errors;
}

function clampedAnniversary(birth: Date, monthOffset: number): Date {
  const year = birth.getFullYear() + Math.floor((birth.getMonth() + monthOffset) / 12);
  const month = (birth.getMonth() + monthOffset) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(birth.getDate(), lastDay));
}

export function completedAgeMonths(dateOfBirth: string, now = new Date()): number {
  const birth = parseCalendarDate(dateOfBirth);
  const today = localToday(now);
  if (!birth || birth > today) throw new Error("INVALID_BABY_DATE_OF_BIRTH");

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (clampedAnniversary(birth, months) > today) months -= 1;
  return Math.max(0, months);
}

export function ageParts(dateOfBirth: string, now = new Date()): {
  years: number;
  months: number;
  totalMonths: number;
} {
  const totalMonths = completedAgeMonths(dateOfBirth, now);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
  };
}
