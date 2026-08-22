import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, X } from "lucide-react";
import type { BabyEvent } from "../types/events";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";

const emoji = {
  sleep: "😴",
  wake_up: "🌅",
  feeding: "🍼",
  diaper: "👶",
};

const eventLabelKeys: Record<BabyEvent["type"], MessageKey> = {
  sleep: "event.sleep",
  wake_up: "event.wake",
  feeding: "event.feed",
  diaper: "event.diaper",
};

const detailLabelKeys: Partial<Record<string, MessageKey>> = {
  breast_left: "event.leftBreast",
  breast_right: "event.rightBreast",
  both_breasts: "event.bothBreasts",
  bottle: "event.bottle",
  formula: "event.formula",
  solid: "event.solid",
  pee: "event.pee",
  poop: "event.poop",
  both: "event.both",
  self: "event.self",
  nursing: "event.nursing",
  pacifier: "event.pacifier",
  held: "event.held",
  rocking: "event.rocking",
  other: "common.other",
};

function eventDetail(event: BabyEvent, t: (key: MessageKey) => string): string | null {
  if (event.type === "feeding") {
    return [event.feedingType ? t(detailLabelKeys[event.feedingType] ?? "common.other") : null, event.feedingAmountMl ? `${event.feedingAmountMl} ml` : null]
      .filter(Boolean)
      .join(" · ") || null;
  }
  if (event.type === "diaper") return event.diaperType ? t(detailLabelKeys[event.diaperType] ?? "common.other") : null;
  if (event.type === "sleep") return event.sleepMethod ? t(detailLabelKeys[event.sleepMethod] ?? "common.other") : null;
  return null;
}

export function EventCard({ event, pending, onEdit, onDelete }: {
  event: BabyEvent;
  pending: boolean;
  onEdit: (event: BabyEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const { dateLocale, t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const detail = eventDetail(event, t);

  return (
    <article className={`event-card ${event.type}`}>
      {confirming ? (
        <div className="delete-confirmation">
          <span>{t("event.deleteConfirm")}</span>
          <div className="row-actions">
            <button className="icon-button" type="button" onClick={() => setConfirming(false)} title={t("common.cancel")} disabled={pending}>
              <X size={18} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => void onDelete(event.id)} title={t("common.delete")} disabled={pending}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="event-icon" aria-hidden="true">{emoji[event.type]}</div>
          <div className="event-copy">
            <div className="event-title-row">
              <strong>{t(eventLabelKeys[event.type])}</strong>
              {event.notes === "QuickLog" && <span className="quick-badge">{t("event.quickLog")}</span>}
            </div>
            {detail && <span className="event-detail">{detail}</span>}
            {event.notes && event.notes !== "QuickLog" && <span className="event-notes">{event.notes}</span>}
          </div>
          <div className="event-meta">
            <time dateTime={event.occurredAt.toISOString()}>{format(event.occurredAt, "HH:mm", { locale: dateLocale })}</time>
            <div className="row-actions">
              <button className="icon-button" type="button" onClick={() => onEdit(event)} title={t("event.editTime")} disabled={pending}>
                <Pencil size={17} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => setConfirming(true)} title={t("common.delete")} disabled={pending}>
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
