import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, X } from "lucide-react";
import type { BabyEvent } from "../types/events";
import { eventTypeLabel } from "../lib/eventRepository";

const emoji = {
  sleep: "😴",
  wake_up: "🌅",
  feeding: "🍼",
  diaper: "👶",
};

function eventDetail(event: BabyEvent): string | null {
  if (event.type === "feeding") {
    return [event.feedingType?.replaceAll("_", " "), event.feedingAmountMl ? `${event.feedingAmountMl} ml` : null]
      .filter(Boolean)
      .join(" · ") || null;
  }
  if (event.type === "diaper") return event.diaperType;
  if (event.type === "sleep") return event.sleepMethod?.replaceAll("_", " ") ?? null;
  return null;
}

export function EventCard({ event, pending, onEdit, onDelete }: {
  event: BabyEvent;
  pending: boolean;
  onEdit: (event: BabyEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const detail = eventDetail(event);

  return (
    <article className={`event-card ${event.type}`}>
      {confirming ? (
        <div className="delete-confirmation">
          <span>Delete this event?</span>
          <div className="row-actions">
            <button className="icon-button" type="button" onClick={() => setConfirming(false)} title="Cancel" disabled={pending}>
              <X size={18} />
            </button>
            <button className="icon-button danger" type="button" onClick={() => void onDelete(event.id)} title="Delete" disabled={pending}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="event-icon" aria-hidden="true">{emoji[event.type]}</div>
          <div className="event-copy">
            <div className="event-title-row">
              <strong>{eventTypeLabel(event.type)}</strong>
              {event.notes === "QuickLog" && <span className="quick-badge">QuickLog</span>}
            </div>
            {detail && <span className="event-detail">{detail}</span>}
            {event.notes && event.notes !== "QuickLog" && <span className="event-notes">{event.notes}</span>}
          </div>
          <div className="event-meta">
            <time dateTime={event.occurredAt.toISOString()}>{format(event.occurredAt, "HH:mm")}</time>
            <div className="row-actions">
              <button className="icon-button" type="button" onClick={() => onEdit(event)} title="Edit time" disabled={pending}>
                <Pencil size={17} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => setConfirming(true)} title="Delete" disabled={pending}>
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
