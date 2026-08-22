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

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const typeOptions: Array<{ type: EventType; label: string; emoji: string }> = [
  { type: "sleep", label: "Sleep", emoji: "😴" },
  { type: "wake_up", label: "Wake", emoji: "🌅" },
  { type: "feeding", label: "Feed", emoji: "🍼" },
  { type: "diaper", label: "Diaper", emoji: "👶" },
];

export function EventSheet({ event, pending, error, onClose, onCreate, onUpdateTime }: {
  event: BabyEvent | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: EventInput) => Promise<unknown>;
  onUpdateTime: (event: BabyEvent, occurredAt: Date) => Promise<unknown>;
}) {
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
      <button className="sheet-backdrop" type="button" onClick={onClose} aria-label="Close" />
      <section className="bottom-sheet">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2 id="event-sheet-title">{event ? "Edit event time" : "New event"}</h2>
          <button className="icon-button" type="button" onClick={onClose} title="Close" disabled={pending}>
            <X size={19} />
          </button>
        </header>

        <form className="event-form" onSubmit={(formEvent) => void submit(formEvent)}>
          {!event && (
            <fieldset className="type-selector">
              <legend>Event type</legend>
              <div>
                {typeOptions.map((option) => (
                  <button
                    key={option.type}
                    className={type === option.type ? `selected ${option.type}` : option.type}
                    type="button"
                    onClick={() => setType(option.type)}
                  >
                    <span>{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <label>
            Date and time
            <input type="datetime-local" step="300" required value={occurredAt} onChange={(changeEvent) => setOccurredAt(changeEvent.target.value)} />
          </label>

          {!event && type === "sleep" && (
            <label>
              How baby fell asleep
              <select value={sleepMethod} onChange={(changeEvent) => setSleepMethod(changeEvent.target.value as SleepMethod | "")}>
                <option value="">Not specified</option>
                <option value="self">Self</option>
                <option value="nursing">Nursing</option>
                <option value="bottle">Bottle</option>
                <option value="pacifier">Pacifier</option>
                <option value="held">Held</option>
                <option value="rocking">Rocking</option>
                <option value="other">Other</option>
              </select>
            </label>
          )}

          {!event && type === "feeding" && (
            <div className="form-grid">
              <label>
                Feeding type
                <select value={feedingType} onChange={(changeEvent) => setFeedingType(changeEvent.target.value as FeedingType | "")}>
                  <option value="">Not specified</option>
                  <option value="breast_left">Left breast</option>
                  <option value="breast_right">Right breast</option>
                  <option value="both_breasts">Both breasts</option>
                  <option value="bottle">Bottle</option>
                  <option value="formula">Formula</option>
                  <option value="solid">Solid</option>
                </select>
              </label>
              <label>
                Amount (ml)
                <input type="number" min="0" step="5" value={feedingAmountMl} onChange={(changeEvent) => setFeedingAmountMl(changeEvent.target.value)} />
              </label>
            </div>
          )}

          {!event && type === "diaper" && (
            <label>
              Diaper type
              <select value={diaperType} required onChange={(changeEvent) => setDiaperType(changeEvent.target.value as DiaperType | "")}>
                <option value="">Select</option>
                <option value="pee">Pee</option>
                <option value="poop">Poop</option>
                <option value="both">Both</option>
              </select>
            </label>
          )}

          {!event && (
            <label>
              Notes
              <textarea rows={2} maxLength={500} value={notes} onChange={(changeEvent) => setNotes(changeEvent.target.value)} />
            </label>
          )}

          {error && <p className="error-banner" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? <span className="spinner small" aria-label="Saving" /> : <Save size={18} />}
            <span>{pending ? "Saving" : "Save"}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
