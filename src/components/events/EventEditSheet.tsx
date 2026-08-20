"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Event } from "@/lib/db/schema";
import { Spinner } from "@/components/ui/Spinner";
import { buildDate, TimePicker, type TimeValue } from "@/components/ui/TimePicker";

export function eventTimePicker(event: Event): TimeValue {
  const d = new Date(event.occurredAt);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((todayStart.getTime() - eventDate.getTime()) / 86_400_000);
  return { dayOffset: Math.min(Math.max(diffDays, 0), 2), hour: d.getHours(), minute: d.getMinutes() };
}

export function EventEditSheet({
  event,
  onClose,
  onSubmit,
  pending,
  submitError,
}: {
  event: Event;
  onClose: () => void;
  onSubmit: (occurredAt: Date) => Promise<void>;
  pending: boolean;
  submitError: string | null;
}) {
  const t = useTranslations("dayView");
  const tForm = useTranslations("eventForm");
  const [timeValue, setTimeValue] = useState<TimeValue>(() => eventTimePicker(event));

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl px-5 pb-8 pt-2.5 safe-area-pb animate-sheet-up">
        <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">{EVENT_EDIT_EMOJI[event.type]}</span>
            {t("editTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 active:scale-90 transition-all duration-150 disabled:opacity-50"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {tForm("time")}
            </label>
            <TimePicker value={timeValue} onChange={setTimeValue} />
          </div>

          {submitError && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3" role="alert">
              {submitError}
            </p>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => onSubmit(buildDate(timeValue.dayOffset, timeValue.hour, timeValue.minute))}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 rounded-2xl font-bold text-sm hover:from-purple-600 hover:to-indigo-700 disabled:opacity-70 transition-all duration-150 active:scale-[0.98] shadow-md shadow-purple-200 flex items-center justify-center gap-2"
          >
            {pending && <Spinner className="w-4 h-4" />}
            {pending ? tForm("saving") : t("saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

const EVENT_EDIT_EMOJI: Record<string, string> = {
  sleep: "😴", wake_up: "🌅", feeding: "🍼", diaper: "👶",
};