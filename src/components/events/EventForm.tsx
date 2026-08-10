"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createEvent } from "@/lib/actions/events";
import { parseInvalidSleepSequenceError, type EventType } from "@/types/events";
import { Spinner } from "@/components/ui/Spinner";
import { buildDate, nowPicker, TimePicker } from "@/components/ui/TimePicker";

const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

// ── Feeding fields ────────────────────────────────────────────────────────────

type FeedingFieldsProps = {
  t: ReturnType<typeof useTranslations>;
  tFeeding: ReturnType<typeof useTranslations>;
};

function FeedingFields({ t, tFeeding }: FeedingFieldsProps) {
  const [feedingType, setFeedingType] = useState("");
  const isBreast = feedingType === "breast_left" || feedingType === "breast_right" || feedingType === "both_breasts";
  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white focus:border-transparent transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>{t("feedingType")}</label>
        <select
          name="feedingType"
          value={feedingType}
          onChange={(e) => setFeedingType(e.target.value)}
          className={inputClass}
        >
          <option value="">{t("selectOption")}</option>
          <option value="breast_left">{tFeeding("breastLeft")}</option>
          <option value="breast_right">{tFeeding("breastRight")}</option>
          <option value="both_breasts">{tFeeding("bothBreasts")}</option>
          <option value="bottle">{tFeeding("bottle")}</option>
          <option value="formula">{tFeeding("formula")}</option>
          <option value="solid">{tFeeding("solid")}</option>
        </select>
      </div>
      <div className="flex gap-3">
        {!isBreast && (
          <div className="flex-1">
            <label className={labelClass}>{t("amount")}</label>
            <input type="number" name="amount" min="0" step="5" placeholder={t("amountPlaceholder")} className={inputClass} />
          </div>
        )}
        <div className="flex-1">
          <label className={labelClass}>{t("duration")}</label>
          <input type="number" name="duration" min="0" placeholder={t("durationPlaceholder")} className={inputClass} />
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

const EVENT_TYPES_STYLE: Record<string, { selected: string; idle: string }> = {
  sleep:   { selected: "border-purple-500 bg-purple-50 text-purple-700 shadow-sm", idle: "border-gray-200 bg-white text-gray-500 hover:border-purple-200" },
  wake_up: { selected: "border-orange-400 bg-orange-50 text-orange-600 shadow-sm", idle: "border-gray-200 bg-white text-gray-500 hover:border-orange-200" },
  feeding: { selected: "border-blue-500 bg-blue-50 text-blue-600 shadow-sm",       idle: "border-gray-200 bg-white text-gray-500 hover:border-blue-200" },
  diaper:  { selected: "border-amber-400 bg-amber-50 text-amber-600 shadow-sm",    idle: "border-gray-200 bg-white text-gray-500 hover:border-amber-200" },
};

const EVENT_EMOJIS: Record<string, string> = {
  sleep: "😴", wake_up: "🌅", feeding: "🍼", diaper: "👶",
};

export function EventForm({ onSuccess, initialType }: { onSuccess?: () => void; initialType?: EventType }) {
  const [selectedType, setSelectedType] = useState<EventType | null>(initialType ?? null);
  const [timeValue, setTimeValue] = useState(nowPicker);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white focus:border-transparent transition-all";
  const t = useTranslations("eventForm");
  const tTypes = useTranslations("eventTypes");
  const tMethods = useTranslations("sleepMethods");
  const tConditions = useTranslations("sleepConditions");
  const tFeeding = useTranslations("feedingTypes");
  const tDiaper = useTranslations("diaperTypes");

  const EVENT_TYPES: { value: EventType; label: string }[] = [
    { value: "sleep",   label: tTypes("sleep") },
    { value: "wake_up", label: tTypes("wakeUp") },
    { value: "feeding", label: tTypes("feeding") },
    { value: "diaper",  label: tTypes("diaper") },
  ];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const occurredAt = buildDate(timeValue.dayOffset, timeValue.hour, timeValue.minute);
    const notes = (formData.get("notes") as string) || undefined;

    setError(null);
    startTransition(async () => {
      try {
        if (selectedType === "sleep") {
          await createEvent({
            type: "sleep", occurredAt, notes,
            sleepMethod: (formData.get("sleepMethod") as string as never) || undefined,
            sleepCondition: (formData.get("sleepCondition") as string as never) || undefined,
            sleepRoomTemperature: formData.get("roomTemp") ? Number(formData.get("roomTemp")) : undefined,
          });
        } else if (selectedType === "wake_up") {
          await createEvent({ type: "wake_up", occurredAt, notes });
        } else if (selectedType === "feeding") {
          const feedingType = formData.get("feedingType") as string;
          const amountMl = formData.get("amount") ? Number(formData.get("amount")) : undefined;
          const durationMinutes = formData.get("duration") ? Number(formData.get("duration")) : undefined;
          await createEvent({ type: "feeding", occurredAt, notes, feedingType: feedingType as never || undefined, feedingAmountMl: amountMl, feedingDurationMinutes: durationMinutes });
        } else if (selectedType === "diaper") {
          await createEvent({
            type: "diaper", occurredAt, notes,
            diaperType: (formData.get("diaperType") as string as never) || undefined,
          });
        }
      } catch (err) {
        const sequenceErrorType = err instanceof Error ? parseInvalidSleepSequenceError(err.message) : null;
        if (sequenceErrorType) {
          setError(t(sequenceErrorType === "sleep" ? "alreadyAsleep" : "alreadyAwake"));
        } else {
          setError(t("genericError"));
        }
        return;
      }

      form.reset();
      setSelectedType(null);
      setTimeValue(nowPicker());
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className={labelClass}>{t("title")}</label>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map(({ value, label }) => {
            const s = EVENT_TYPES_STYLE[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setSelectedType(value); setError(null); }}
                className={`py-4 rounded-2xl border-2 text-xs font-semibold transition-all active:scale-95 ${selectedType === value ? s.selected : s.idle}`}
              >
                <span className="text-2xl block mb-1">{EVENT_EMOJIS[value]}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedType && (
        <>
          {/* Time picker */}
          <div>
            <label className={labelClass}>{t("time")}</label>
            <TimePicker value={timeValue} onChange={setTimeValue} />
          </div>

          {/* Sleep fields */}
          {selectedType === "sleep" && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t("howFellAsleep")}</label>
                <select name="sleepMethod" className={inputClass}>
                  <option value="">{t("selectOption")}</option>
                  <option value="nursing">{tMethods("nursing")}</option>
                  <option value="bottle">{tMethods("bottle")}</option>
                  <option value="pacifier">{tMethods("pacifier")}</option>
                  <option value="held">{tMethods("held")}</option>
                  <option value="rocking">{tMethods("rocking")}</option>
                  <option value="self">{tMethods("self")}</option>
                  <option value="other">{tMethods("other")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("sleepCondition")}</label>
                <select name="sleepCondition" className={inputClass}>
                  <option value="">{t("selectOption")}</option>
                  <option value="sleep_sack">{tConditions("sleepSack")}</option>
                  <option value="pajamas">{tConditions("pajamas")}</option>
                  <option value="bodysuit">{tConditions("bodysuit")}</option>
                  <option value="top_and_bottoms">{tConditions("topAndBottoms")}</option>
                  <option value="other">{tConditions("other")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("roomTemp")}</label>
                <select name="roomTemp" defaultValue="25" className={inputClass}>
                  {Array.from({ length: 16 }, (_, i) => 15 + i).map((temp) => (
                    <option key={temp} value={temp}>{temp}°C</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedType === "feeding" && <FeedingFields t={t} tFeeding={tFeeding} />}

          {/* Diaper type */}
          {selectedType === "diaper" && (
            <div>
              <label className={labelClass}>{t("diaperType")}</label>
              <div className="flex gap-2">
                {[
                  { value: "pee",  emoji: "💧", label: tDiaper("pee") },
                  { value: "poop", emoji: "💩", label: tDiaper("poop") },
                  { value: "both", emoji: "💧💩", label: tDiaper("both") },
                ].map(({ value, emoji, label }) => (
                  <label key={value} className="flex-1">
                    <input type="radio" name="diaperType" value={value} className="sr-only peer" required />
                    <span className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 border-gray-200 text-xs font-semibold text-gray-500 cursor-pointer peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-700 hover:border-amber-200 transition-all active:scale-95">
                      <span className="text-xl">{emoji}</span>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>{t("notes")}</label>
            <textarea
              name="notes"
              rows={2}
              placeholder={t("notesPlaceholder")}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-4 rounded-2xl font-bold text-sm hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-70 transition-all duration-150 active:scale-[0.98] shadow-md shadow-purple-200 flex items-center justify-center gap-2"
          >
            {isPending && <Spinner className="w-4 h-4" />}
            {isPending ? t("saving") : t("save")}
          </button>
        </>
      )}
    </form>
  );
}
