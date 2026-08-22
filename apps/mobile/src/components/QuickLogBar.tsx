import { useState } from "react";
import type { EventInput, EventType } from "../types/events";

const actions: Array<{ type: EventType; emoji: string; label: string }> = [
  { type: "sleep", emoji: "😴", label: "Sleep" },
  { type: "wake_up", emoji: "🌅", label: "Wake" },
  { type: "feeding", emoji: "🍼", label: "Feed" },
  { type: "diaper", emoji: "👶", label: "Diaper" },
];

export function QuickLogBar({ disabled, onCreate }: {
  disabled: boolean;
  onCreate: (input: EventInput) => Promise<unknown>;
}) {
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
    <div className="quick-log" aria-label="Quick log">
      {actions.map((action) => (
        <button
          key={action.type}
          className={`quick-action ${action.type}`}
          type="button"
          disabled={disabled}
          onClick={() => void log(action.type)}
        >
          <span className="quick-emoji">{saved === action.type ? "✓" : action.emoji}</span>
          <span>{saved === action.type ? "Saved" : action.label}</span>
        </button>
      ))}
    </div>
  );
}
