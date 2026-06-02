import { format, formatDuration, intervalToDuration } from "date-fns";
import type { EventType, DiaperType, SleepMethod } from "@/types/events";

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatDateTime(date: Date): string {
  return format(date, "MMM d · HH:mm");
}

export function formatSleepDuration(start: Date, end: Date): string {
  const duration = intervalToDuration({ start, end });
  return formatDuration(duration, { format: ["hours", "minutes"] });
}

export function eventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    sleep: "Sleep",
    wake_up: "Wake up",
    feeding: "Feeding",
    diaper: "Diaper",
  };
  return labels[type];
}

export function diaperTypeLabel(type: DiaperType): string {
  const labels: Record<DiaperType, string> = {
    pee: "Pee",
    poop: "Poop",
    both: "Pee & Poop",
  };
  return labels[type];
}

export function sleepMethodLabel(method: SleepMethod): string {
  const labels: Record<SleepMethod, string> = {
    nursing: "While breastfeeding",
    bottle: "While drinking bottle",
    pacifier: "Pacifier",
    held: "Being held",
    rocking: "Rocking",
    self: "Self-soothing",
    other: "Other",
  };
  return labels[method];
}
