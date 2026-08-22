import { useState } from "react";
import { Save, X } from "lucide-react";
import type {
  BabyEvent,
  DiaperType,
  EventInput,
  EventType,
  FeedingType,
  SleepMethod,
} from "../types/events";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const typeOptions: Array<{ type: EventType; label: MessageKey; emoji: string }> = [
  { type: "sleep", label: "quick.sleep", emoji: "😴" },
  { type: "wake_up", label: "quick.wake", emoji: "🌅" },
  { type: "feeding", label: "quick.feed", emoji: "🍼" },
  { type: "diaper", label: "quick.diaper", emoji: "👶" },
];

export function EventSheet({ event, pending, error, onClose, onCreate, onUpdateTime }: {
  event: BabyEvent | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: EventInput) => Promise<unknown>;
  onUpdateTime: (event: BabyEvent, occurredAt: Date) => Promise<unknown>;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<EventType>(event?.type ?? "sleep");
  const [occurredAt, setOccurredAt] = useState(() => localDateTime(event?.occurredAt ?? new Date()));
  const [notes, setNotes] = useState(event?.notes === "QuickLog" ? "" : event?.notes ?? "");
  const [sleepMethod, setSleepMethod] = useState<SleepMethod | "">(event?.sleepMethod ?? "");
  const [feedingType, setFeedingType] = useState<FeedingType | "">(event?.feedingType ?? "");
  const [feedingAmountMl, setFeedingAmountMl] = useState(event?.feedingAmountMl?.toString() ?? "");
  const [diaperType, setDiaperType] = useState<DiaperType | "">(event?.diaperType ?? "");

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const date = new Date(occurredAt);
    try {
      if (event) {
        await onUpdateTime(event, date);
        onClose();
        return;
      }

      await onCreate({
        type,
        occurredAt: date,
        notes: notes.trim() || null,
        sleepMethod: type === "sleep" ? sleepMethod || null : null,
        feedingType: type === "feeding" ? feedingType || null : null,
        feedingAmountMl: type === "feeding" && feedingAmountMl ? Number(feedingAmountMl) : null,
        diaperType: type === "diaper" ? diaperType || null : null,
      });
      onClose();
    } catch {
      return;
    }
  }

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-labelledby="event-sheet-title">
      <button className="sheet-backdrop" type="button" onClick={onClose} aria-label={t("common.close")} />
      <section className="bottom-sheet">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2 id="event-sheet-title">{event ? t("event.editTimeTitle") : t("event.new")}</h2>
          <button className="icon-button" type="button" onClick={onClose} title={t("common.close")} disabled={pending}>
            <X size={19} />
          </button>
        </header>

        <form className="event-form" onSubmit={(formEvent) => void submit(formEvent)}>
          {!event && (
            <fieldset className="type-selector">
              <legend>{t("event.type")}</legend>
              <div>
                {typeOptions.map((option) => (
                  <button
                    key={option.type}
                    className={type === option.type ? `selected ${option.type}` : option.type}
                    type="button"
                    onClick={() => setType(option.type)}
                  >
                    <span>{option.emoji}</span>
                    {t(option.label)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <label>
            {t("event.dateTime")}
            <input type="datetime-local" step="300" required value={occurredAt} onChange={(changeEvent) => setOccurredAt(changeEvent.target.value)} />
          </label>

          {!event && type === "sleep" && (
            <label>
              {t("event.sleepMethod")}
              <select value={sleepMethod} onChange={(changeEvent) => setSleepMethod(changeEvent.target.value as SleepMethod | "")}>
                <option value="">{t("common.notSpecified")}</option>
                <option value="self">{t("event.self")}</option>
                <option value="nursing">{t("event.nursing")}</option>
                <option value="bottle">{t("event.bottle")}</option>
                <option value="pacifier">{t("event.pacifier")}</option>
                <option value="held">{t("event.held")}</option>
                <option value="rocking">{t("event.rocking")}</option>
                <option value="other">{t("common.other")}</option>
              </select>
            </label>
          )}

          {!event && type === "feeding" && (
            <div className="form-grid">
              <label>
                {t("event.feedingType")}
                <select value={feedingType} onChange={(changeEvent) => setFeedingType(changeEvent.target.value as FeedingType | "")}>
                  <option value="">{t("common.notSpecified")}</option>
                  <option value="breast_left">{t("event.leftBreast")}</option>
                  <option value="breast_right">{t("event.rightBreast")}</option>
                  <option value="both_breasts">{t("event.bothBreasts")}</option>
                  <option value="bottle">{t("event.bottle")}</option>
                  <option value="formula">{t("event.formula")}</option>
                  <option value="solid">{t("event.solid")}</option>
                </select>
              </label>
              <label>
                {t("event.amountMl")}
                <input type="number" min="0" step="5" value={feedingAmountMl} onChange={(changeEvent) => setFeedingAmountMl(changeEvent.target.value)} />
              </label>
            </div>
          )}

          {!event && type === "diaper" && (
            <label>
              {t("event.diaperType")}
              <select value={diaperType} required onChange={(changeEvent) => setDiaperType(changeEvent.target.value as DiaperType | "")}>
                <option value="">{t("event.select")}</option>
                <option value="pee">{t("event.pee")}</option>
                <option value="poop">{t("event.poop")}</option>
                <option value="both">{t("event.both")}</option>
              </select>
            </label>
          )}

          {!event && (
            <label>
              {t("event.notes")}
              <textarea rows={2} maxLength={500} value={notes} onChange={(changeEvent) => setNotes(changeEvent.target.value)} />
            </label>
          )}

          {error && <p className="error-banner" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? <span className="spinner small" aria-label={t("common.saving")} /> : <Save size={18} />}
            <span>{pending ? t("common.saving") : t("common.save")}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
