import { useState } from "react";
import type { EventInput, EventType } from "../types/events";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";

const actions: Array<{ type: EventType; emoji: string; label: MessageKey }> = [
  { type: "sleep", emoji: "😴", label: "quick.sleep" },
  { type: "wake_up", emoji: "🌅", label: "quick.wake" },
  { type: "feeding", emoji: "🍼", label: "quick.feed" },
  { type: "diaper", emoji: "👶", label: "quick.diaper" },
];

export function QuickLogBar({ disabled, onCreate }: {
  disabled: boolean;
  onCreate: (input: EventInput) => Promise<unknown>;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState<EventType | null>(null);

  async function log(type: EventType) {
    try {
      await onCreate({ type, occurredAt: new Date(), notes: "QuickLog" });
      setSaved(type);
      window.setTimeout(() => setSaved(null), 1000);
    } catch {
      setSaved(null);
    }
  }

  return (
    <div className="quick-log" aria-label={t("quick.label")}>
      {actions.map((action) => (
        <button
          key={action.type}
          className={`quick-action ${action.type}`}
          type="button"
          disabled={disabled}
          onClick={() => void log(action.type)}
        >
          <span className="quick-emoji">{saved === action.type ? "✓" : action.emoji}</span>
          <span>{saved === action.type ? t("quick.saved") : t(action.label)}</span>
        </button>
      ))}
    </div>
  );
}
