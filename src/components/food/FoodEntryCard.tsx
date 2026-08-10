"use client";

import type { FoodEntry } from "@/lib/db/schema";
import type { FoodCategory } from "@/types/foods";
import { Spinner } from "@/components/ui/Spinner";

const CATEGORY_STYLE: Record<FoodCategory, { emoji: string; chip: string; card: string; soft: string }> = {
  fruit:     { emoji: "🍎", chip: "bg-emerald-50 text-emerald-600", card: "border-l-emerald-400", soft: "bg-emerald-50" },
  vegetable: { emoji: "🥦", chip: "bg-green-50 text-green-600",     card: "border-l-green-400",   soft: "bg-green-50" },
  cereal:    { emoji: "🌾", chip: "bg-amber-50 text-amber-600",     card: "border-l-amber-400",   soft: "bg-amber-50" },
  protein:   { emoji: "🍗", chip: "bg-rose-50 text-rose-600",       card: "border-l-rose-400",    soft: "bg-rose-50" },
  dairy:     { emoji: "🧀", chip: "bg-blue-50 text-blue-600",       card: "border-l-blue-400",    soft: "bg-blue-50" },
  legumes:   { emoji: "🫘", chip: "bg-teal-50 text-teal-600",       card: "border-l-teal-400",    soft: "bg-teal-50" },
  other:     { emoji: "🍴", chip: "bg-gray-100 text-gray-600",      card: "border-l-gray-300",    soft: "bg-gray-100" },
};

const ICON_BUTTON =
  "w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 active:scale-90 transition-all duration-150";

export function FoodEntryCard({
  entry,
  timeLabel,
  isConfirmingDelete,
  isDeleting,
  t,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  entry: FoodEntry;
  timeLabel: string;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  t: (k: string) => string;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const style = CATEGORY_STYLE[entry.category] ?? CATEGORY_STYLE.other;

  if (isConfirmingDelete) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${style.card} px-4 py-3 shadow-sm transition-opacity ${isDeleting ? "opacity-40" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-600">{t("deleteConfirm")}</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onCancelDelete}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-medium active:bg-gray-200 active:scale-95 transition-all duration-150"
            >
              {t("deleteCancelButton")}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirmDelete}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium active:bg-red-600 active:scale-95 transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting && <Spinner className="w-3 h-3" />}
              {t("deleteConfirmButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${style.card} px-4 py-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${style.soft} flex items-center justify-center text-lg leading-none flex-shrink-0`}>
          {style.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{entry.name}</span>
            {entry.amount && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.chip}`}>{entry.amount}</span>
            )}
          </div>
          {entry.notes && (
            <p className="text-xs text-gray-400 italic mt-1 truncate">{entry.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <span className="text-xs text-gray-400 tabular-nums font-medium mr-1">{timeLabel}</span>
          <button
            type="button"
            onClick={onEdit}
            className={`${ICON_BUTTON} hover:text-emerald-500 hover:bg-emerald-50 active:bg-emerald-100`}
            aria-label={t("editEntry")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            className={`${ICON_BUTTON} hover:text-red-400 hover:bg-red-50 active:bg-red-100`}
            aria-label={t("deleteEntry")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}