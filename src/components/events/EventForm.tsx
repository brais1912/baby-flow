"use client";

import { useState, useTransition } from "react";
import { createEvent } from "@/lib/actions/events";
import type { EventType } from "@/types/events";

const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: "sleep", label: "Sleep", emoji: "😴" },
  { value: "feeding", label: "Feeding", emoji: "🍼" },
  { value: "diaper", label: "Diaper", emoji: "👶" },
];

export function EventForm({ onSuccess }: { onSuccess?: () => void }) {
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const occurredAt = new Date(formData.get("occurredAt") as string);

    startTransition(async () => {
      if (selectedType === "sleep") {
        await createEvent({
          type: "sleep",
          occurredAt,
          notes: formData.get("notes") as string || undefined,
          sleepMethod: formData.get("sleepMethod") as string as never || undefined,
          sleepCondition: formData.get("sleepCondition") as string as never || undefined,
          sleepRoomTemperature: formData.get("roomTemp") ? Number(formData.get("roomTemp")) : undefined,
          sleepWokeUpAt: formData.get("wokeUpAt") ? new Date(formData.get("wokeUpAt") as string) : undefined,
        });
      } else if (selectedType === "feeding") {
        await createEvent({
          type: "feeding",
          occurredAt,
          notes: formData.get("notes") as string || undefined,
          feedingType: formData.get("feedingType") as string as never || undefined,
          feedingAmountMl: formData.get("amount") ? Number(formData.get("amount")) : undefined,
          feedingDurationMinutes: formData.get("duration") ? Number(formData.get("duration")) : undefined,
        });
      } else if (selectedType === "diaper") {
        await createEvent({
          type: "diaper",
          occurredAt,
          notes: formData.get("notes") as string || undefined,
          diaperType: formData.get("diaperType") as string as never || undefined,
        });
      }

      form.reset();
      setSelectedType(null);
      onSuccess?.();
    });
  }

  const nowLocalISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
        <div className="flex gap-2">
          {EVENT_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedType(value)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedType === value
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-purple-200"
              }`}
            >
              <span className="text-lg block">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="datetime-local"
              name="occurredAt"
              defaultValue={nowLocalISO}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {selectedType === "sleep" && <SleepFields />}
          {selectedType === "feeding" && <FeedingFields />}
          {selectedType === "diaper" && <DiaperFields />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving..." : "Save Event"}
          </button>
        </>
      )}
    </form>
  );
}

function SleepFields() {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">How they fell asleep</label>
        <select
          name="sleepMethod"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Select...</option>
          <option value="pacifier">Pacifier</option>
          <option value="held">Being held</option>
          <option value="rocking">Rocking</option>
          <option value="self">Self-soothing</option>
          <option value="nursing">Nursing</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sleep condition</label>
        <select
          name="sleepCondition"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Select...</option>
          <option value="sleep_sack">Sleep sack</option>
          <option value="pajamas">Just pajamas</option>
          <option value="swaddle">Swaddle</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Room temp (°C)</label>
          <input
            type="number"
            name="roomTemp"
            step="0.1"
            min="15"
            max="30"
            placeholder="e.g. 20"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Woke up at</label>
          <input
            type="datetime-local"
            name="wokeUpAt"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>
    </div>
  );
}

function FeedingFields() {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Feeding type</label>
        <select
          name="feedingType"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">Select...</option>
          <option value="breast_left">Breast (left)</option>
          <option value="breast_right">Breast (right)</option>
          <option value="bottle">Bottle (breast milk)</option>
          <option value="formula">Formula</option>
          <option value="solid">Solid food</option>
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ml)</label>
          <input
            type="number"
            name="amount"
            min="0"
            step="5"
            placeholder="e.g. 120"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
          <input
            type="number"
            name="duration"
            min="0"
            placeholder="e.g. 15"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>
    </div>
  );
}

function DiaperFields() {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
      <div className="flex gap-2">
        {[
          { value: "pee", label: "💧 Pee" },
          { value: "poop", label: "💩 Poop" },
          { value: "both", label: "Both" },
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
  );
}
