"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createEvent } from "@/lib/actions/events";
import type { EventType } from "@/types/events";

type FeedingFieldsProps = {
  t: ReturnType<typeof useTranslations>;
  tFeeding: ReturnType<typeof useTranslations>;
};

function FeedingFields({ t, tFeeding }: FeedingFieldsProps) {
  const [feedingType, setFeedingType] = useState("");
  const isBreast = feedingType === "breast_left" || feedingType === "breast_right" || feedingType === "both_breasts";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("feedingType")}</label>
        <select
          name="feedingType"
          value={feedingType}
          onChange={(e) => setFeedingType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("amount")}</label>
            <input type="number" name="amount" min="0" step="5" placeholder={t("amountPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
        )}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("duration")}</label>
          <input type="number" name="duration" min="0" placeholder={t("durationPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
      </div>
    </div>
  );
}

export function EventForm({ onSuccess, initialType }: { onSuccess?: () => void; initialType?: EventType }) {
  const [selectedType, setSelectedType] = useState<EventType | null>(initialType ?? null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("eventForm");
  const tTypes = useTranslations("eventTypes");
  const tMethods = useTranslations("sleepMethods");
  const tConditions = useTranslations("sleepConditions");
  const tFeeding = useTranslations("feedingTypes");
  const tDiaper = useTranslations("diaperTypes");

  const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
    { value: "sleep",   label: tTypes("sleep"),   emoji: "😴" },
    { value: "wake_up", label: tTypes("wakeUp"),  emoji: "🌅" },
    { value: "feeding", label: tTypes("feeding"), emoji: "🍼" },
    { value: "diaper",  label: tTypes("diaper"),  emoji: "👶" },
  ];

  useEffect(() => {
    setSelectedType(initialType ?? null);
  }, [initialType]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const occurredAt = new Date(formData.get("occurredAt") as string);
    const notes = (formData.get("notes") as string) || undefined;

    startTransition(async () => {
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
        if (feedingType === "both_breasts") {
          await createEvent({ type: "feeding", occurredAt, notes, feedingType: "breast_left" as never, feedingDurationMinutes: durationMinutes });
          await createEvent({ type: "feeding", occurredAt, notes, feedingType: "breast_right" as never, feedingDurationMinutes: durationMinutes });
        } else {
          await createEvent({ type: "feeding", occurredAt, notes, feedingType: feedingType as never || undefined, feedingAmountMl: amountMl, feedingDurationMinutes: durationMinutes });
        }
      } else if (selectedType === "diaper") {
        await createEvent({
          type: "diaper", occurredAt, notes,
          diaperType: (formData.get("diaperType") as string as never) || undefined,
        });
      }

      form.reset();
      setSelectedType(null);
      onSuccess?.();
    });
  }

  const nowLocalISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("title")}</label>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map(({ value, label, emoji }) => (
            <button key={value} type="button" onClick={() => setSelectedType(value)}
              className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedType === value
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"
              }`}>
              <span className="text-lg block">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("time")}</label>
            <input type="datetime-local" name="occurredAt" defaultValue={nowLocalISO} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          {selectedType === "sleep" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("howFellAsleep")}</label>
                <select name="sleepMethod" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("sleepCondition")}</label>
                <select name="sleepCondition" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">{t("selectOption")}</option>
                  <option value="sleep_sack">{tConditions("sleepSack")}</option>
                  <option value="pajamas">{tConditions("pajamas")}</option>
                  <option value="swaddle">{tConditions("swaddle")}</option>
                  <option value="other">{tConditions("other")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("roomTemp")}</label>
                <select name="roomTemp" defaultValue="25" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {Array.from({ length: 16 }, (_, i) => 15 + i).map((temp) => (
                    <option key={temp} value={temp}>{temp}°C</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedType === "feeding" && <FeedingFields t={t} tFeeding={tFeeding} />}

          {selectedType === "diaper" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("diaperType")}</label>
              <div className="flex gap-2">
                {[
                  { value: "pee",  label: `💧 ${tDiaper("pee")}` },
                  { value: "poop", label: `💩 ${tDiaper("poop")}` },
                  { value: "both", label: tDiaper("both") },
                ].map(({ value, label }) => (
                  <label key={value} className="flex-1">
                    <input type="radio" name="diaperType" value={value} className="sr-only peer" required />
                    <span className="block text-center py-2 rounded-lg border-2 border-gray-200 text-sm cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-50 peer-checked:text-purple-700 hover:border-purple-200 transition-all">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("notes")}</label>
            <textarea name="notes" rows={2} placeholder={t("notesPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {isPending ? t("saving") : t("save")}
          </button>
        </>
      )}
    </form>
  );
}
