import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { EventCard } from "./EventCard";

function event(id: string, type: EventType, occurredAt: Date): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: "QuickLog",
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function renderCard(current: BabyEvent, allEvents: BabyEvent[]) {
  render(
    <EventCard
      event={current}
      allEvents={allEvents}
      pending={false}
      onEdit={vi.fn()}
      onDelete={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe("EventCard phase durations", () => {
  it("shows awake duration when sleep starts", () => {
    const wake = event("wake", "wake_up", new Date(2026, 7, 21, 12));
    const sleep = event("sleep", "sleep", new Date(2026, 7, 21, 13, 30));
    renderCard(sleep, [sleep, wake]);
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
    expect(screen.getByText("1h 30m").closest(".duration-badge")).toHaveClass("awake");
  });

  it("shows sleep duration when the baby wakes", () => {
    const sleep = event("sleep", "sleep", new Date(2026, 7, 20, 22));
    const wake = event("wake", "wake_up", new Date(2026, 7, 21, 7));
    renderCard(wake, [wake, sleep]);
    expect(screen.getByText("9h")).toBeInTheDocument();
    expect(screen.getByText("9h").closest(".duration-badge")).toHaveClass("sleep");
  });

  it("omits duration when there is no preceding phase", () => {
    const sleep = event("sleep", "sleep", new Date(2026, 7, 21, 13));
    renderCard(sleep, [sleep]);
    expect(document.querySelector(".duration-badge")).not.toBeInTheDocument();
  });
});
