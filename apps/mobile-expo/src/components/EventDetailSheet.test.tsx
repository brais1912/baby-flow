import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { EventDetailSheet } from "./EventDetailSheet";

function event(id: string, type: EventType, occurredAt: Date, overrides: Partial<BabyEvent> = {}): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

describe("EventDetailSheet", () => {
  it("describes an event-list sleep transition in natural language and offers editing", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const wake = event("wake", "wake_up", new Date(2026, 7, 24, 10));
    const sleep = event("sleep", "sleep", new Date(2026, 7, 24, 11, 30), {
      notes: "Settled quickly",
      sleepMethod: "rocking",
    });

    render(
      <EventDetailSheet
        visible
        event={sleep}
        allEvents={[wake, sleep]}
        babyName="Luna"
        onClose={vi.fn()}
        onEdit={onEdit}
      />
    );

    expect(screen.getByText("Luna was awake for 1 hour 30 minutes before falling asleep at 11:30.")).toBeInTheDocument();
    expect(screen.getByText("Rocking")).toBeInTheDocument();
    expect(screen.getByText("Settled quickly")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit time" }));
    expect(onEdit).toHaveBeenCalledWith(sleep);
  });

  it("describes a paired timeline sleep as a completed sleep session", () => {
    const sleep = event("sleep", "sleep", new Date(2026, 7, 24, 21));
    const wake = event("wake", "wake_up", new Date(2026, 7, 24, 23));

    render(
      <EventDetailSheet
        visible
        event={sleep}
        allEvents={[sleep, wake]}
        babyName="Luna"
        pairedWake={wake}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Luna slept for 2 hours, from 21:00 to 23:00.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit time" })).not.toBeInTheDocument();
  });

  it("keeps feeding measurements and notes scannable", () => {
    const feeding = event("feeding", "feeding", new Date(2026, 7, 24, 14, 15), {
      feedingType: "bottle",
      feedingAmountMl: 120,
      feedingDurationMinutes: 20,
    });

    render(
      <EventDetailSheet
        visible
        event={feeding}
        allEvents={[feeding]}
        babyName="Luna"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Luna had a feeding at 14:15.")).toBeInTheDocument();
    expect(screen.getByText("Bottle")).toBeInTheDocument();
    expect(screen.getByText("120 ml")).toBeInTheDocument();
    expect(screen.getByText("20 min")).toBeInTheDocument();
  });
});
