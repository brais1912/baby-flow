"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format, isSameWeek, isToday, isYesterday } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { FoodEntry } from "@/lib/db/schema";
import type { FoodEntryInput } from "@/types/foods";
import { createFoodEntry, deleteFoodEntry, updateFoodEntry } from "@/lib/actions/foods";
import { groupFoodEntriesByDay } from "@/lib/utils/food";
import { formatTime } from "@/lib/utils/format";
import { FoodEntryCard } from "./FoodEntryCard";
import { FoodSheet, type FoodSheetMode } from "./FoodSheet";

export function FoodLogClient({ entries }: { entries: FoodEntry[] }) {
  const router = useRouter();
  const t = useTranslations("food");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;

  const [sheet, setSheet] = useState<FoodSheetMode | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const todayCount = entries.filter((e) => isToday(new Date(e.eatenAt))).length;
  const weekCount = entries.filter((e) => isSameWeek(new Date(e.eatenAt), now, { weekStartsOn: 1 })).length;
  const groups = groupFoodEntriesByDay(entries);

  function openCreate() {
    setSubmitError(null);
    setSheet({ mode: "create" });
  }

  function openEdit(entry: FoodEntry) {
    setSubmitError(null);
    setSheet({ mode: "edit", entry });
  }

  function submit(input: FoodEntryInput): Promise<void> {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          if (sheet?.mode === "edit" && sheet.entry) {
            await updateFoodEntry(sheet.entry.id, input);
          } else {
            await createFoodEntry(input);
          }
          router.refresh();
          setSubmitError(null);
          setSheet(null);
        } catch {
          setSubmitError(t("genericError"));
        } finally {
          resolve();
        }
      });
    });
  }

  function confirmDelete(entryId: string) {
    startTransition(async () => {
      await deleteFoodEntry(entryId);
      setConfirmDeleteId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white px-5 py-6 shadow-lg shadow-emerald-200/60">
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 left-8 w-44 h-44 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl leading-none">
              🥣
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/90">
                {t("todayLabel")}
              </p>
              <p className="text-4xl font-extrabold leading-tight tabular-nums">{todayCount}</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5">
            📅 {t("weekCount", { count: weekCount })}
          </span>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="relative mt-5 w-full bg-white text-emerald-700 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          {t("addFood")}
        </button>
      </div>

      {/* Day-grouped list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center page-enter">
          <p className="text-4xl mb-3">🍎🥦🌾</p>
          <p className="text-sm font-bold text-gray-700">{t("emptyTitle")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("emptyHint")}</p>
        </div>
      ) : (
        groups.map((group) => {
          const groupDate = new Date(group.date);
          const dayLabel = isToday(groupDate)
            ? t("today")
            : isYesterday(groupDate)
            ? t("yesterday")
            : format(groupDate, "EEEE d MMM", { locale: dateFnsLocale });

          return (
            <div key={group.date.getTime()} className="space-y-2 page-enter">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <span>{dayLabel}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 tabular-nums">
                    {group.items.length}
                  </span>
                </h3>
              </div>
              {group.items.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  timeLabel={formatTime(new Date(entry.eatenAt))}
                  isConfirmingDelete={confirmDeleteId === entry.id}
                  isDeleting={isPending && confirmDeleteId === entry.id}
                  t={t}
                  onEdit={() => openEdit(entry)}
                  onRequestDelete={() => setConfirmDeleteId(entry.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => confirmDelete(entry.id)}
                />
              ))}
            </div>
          );
        })
      )}

      {sheet && (
        <FoodSheet
          key={sheet.mode === "edit" && sheet.entry ? sheet.entry.id : "create"}
          mode={sheet}
          onClose={() => setSheet(null)}
          onSubmit={submit}
          pending={isPending}
          submitError={submitError}
        />
      )}
    </div>
  );
}