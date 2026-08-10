"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FoodEntry } from "@/lib/db/schema";
import { FOOD_CATEGORIES, type FoodCategory, type FoodEntryInput } from "@/types/foods";
import { Spinner } from "@/components/ui/Spinner";
import { buildDate, nowPicker, TimePicker, type TimeValue } from "@/components/ui/TimePicker";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white focus:border-transparent transition-all";

export interface FoodSheetMode {
  mode: "create" | "edit";
  entry?: FoodEntry;
}

function entryTimePicker(entry: FoodEntry): TimeValue {
  const d = new Date(entry.eatenAt);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((todayStart.getTime() - entryDate.getTime()) / 86_400_000);
  return { dayOffset: Math.min(Math.max(diffDays, 0), 2), hour: d.getHours(), minute: d.getMinutes() };
}

export function FoodSheet({
  mode,
  onClose,
  onSubmit,
  pending,
  submitError,
}: {
  mode: FoodSheetMode;
  onClose: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
  pending: boolean;
  submitError: string | null;
}) {
  const t = useTranslations("food");
  const [name, setName] = useState(mode.entry?.name ?? "");
  const [category, setCategory] = useState<FoodCategory>(mode.entry?.category ?? "other");
  const [amount, setAmount] = useState(mode.entry?.amount ?? "");
  const [notes, setNotes] = useState(mode.entry?.notes ?? "");
  const [timeValue, setTimeValue] = useState<TimeValue>(() => (mode.entry ? entryTimePicker(mode.entry) : nowPicker()));
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isEdit = mode.mode === "edit";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setFieldError(t("nameRequired"));
      return;
    }
    setFieldError(null);
    onSubmit({
      name,
      category,
      amount,
      notes,
      eatenAt: buildDate(timeValue.dayOffset, timeValue.hour, timeValue.minute),
    });
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl px-5 pb-8 pt-2.5 safe-area-pb animate-sheet-up max-h-[88vh] flex flex-col">
        <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4 flex-shrink-0" />

        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🥣</span>
            {isEdit ? t("editTitle") : t("addTitle")}
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

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto overscroll-contain pr-0.5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t("name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldError(null); }}
              placeholder={t("namePlaceholder")}
              maxLength={60}
              autoFocus
              className={`${inputClass} ${fieldError ? "border-red-300 focus:ring-red-400" : ""}`}
            />
            {fieldError && (
              <p className="text-xs font-medium text-red-600 mt-1.5">{fieldError}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t("category")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FOOD_CATEGORIES.map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    <span>{CATEGORY_EMOJI[c]}</span>
                    {t(c)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t("timeLabel")}
            </label>
            <TimePicker value={timeValue} onChange={setTimeValue} ns="food" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t("amount")}
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("amountPlaceholder")}
              maxLength={40}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {t("notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("notesPlaceholder")}
              maxLength={280}
              className={`${inputClass} resize-none`}
            />
          </div>

          {submitError && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3" role="alert">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-bold text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-70 transition-all duration-150 active:scale-[0.98] shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
          >
            {pending && <Spinner className="w-4 h-4" />}
            {pending ? t("saving") : t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  fruit: "🍎",
  vegetable: "🥦",
  cereal: "🌾",
  protein: "🍗",
  dairy: "🧀",
  legumes: "🫘",
  other: "🍴",
};