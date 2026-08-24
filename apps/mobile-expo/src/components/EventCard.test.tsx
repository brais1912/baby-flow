import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { BabyEvent } from "../types/events";
import { EventCard } from "./EventCard";

function event(id: string, hour: number): BabyEvent {
  const occurredAt = new Date(2026, 7, 24, hour);
  return {
    id,
    userId: "user-1",
    type: "sleep",
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
  };
}

function EventCards({
  events,
  pending = false,
  onEdit = vi.fn(),
  onDelete = vi.fn().mockResolvedValue(undefined),
}: {
  events: BabyEvent[];
  pending?: boolean;
  onEdit?: (event: BabyEvent) => void;
  onDelete?: (eventId: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  return events.map((item) => (
    <EventCard
      key={item.id}
      event={item}
      allEvents={events}
      pending={pending}
      confirming={confirmingId === item.id}
      swipeOpen={openId === item.id}
      onOpen={vi.fn()}
      onEdit={onEdit}
      onDelete={onDelete}
      onDeleteRequest={(eventId) => {
        setOpenId(null);
        setConfirmingId(eventId);
      }}
      onDeleteCancel={(eventId) => setConfirmingId((current) => current === eventId ? null : current)}
      onSwipeOpen={setOpenId}
      onSwipeClose={(eventId) => setOpenId((current) => current === eventId ? null : current)}
    />
  ));
}

describe("EventCard swipe actions", () => {
  it("opens the existing edit flow immediately after a completed right swipe", () => {
    const sleep = event("sleep-1", 20);
    const onEdit = vi.fn();
    render(<EventCards events={[sleep]} onEdit={onEdit} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-right"));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledWith(sleep);
    expect(screen.queryByText("Delete this event?")).not.toBeInTheDocument();
  });

  it("asks for confirmation immediately after a completed left swipe", () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EventCards events={[event("sleep-1", 20)]} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-left"));
    expect(screen.getByText("Delete this event?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("reuses the existing confirmation and only deletes after explicit confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EventCards events={[event("sleep-1", 20)]} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-left"));
    expect(screen.getByText("Delete this event?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith("sleep-1");
  });

  it("cancels confirmation without deleting", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EventCards events={[event("sleep-1", 20)]} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-left"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete this event?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Sleep details at 20:00" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps only one row in confirmation", () => {
    render(<EventCards events={[event("sleep-1", 20), event("sleep-2", 21)]} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-left"));
    expect(screen.getAllByText("Delete this event?")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("event-swipe-sleep-2-swipe-left"));
    expect(screen.getAllByText("Delete this event?")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open Sleep details at 20:00" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Sleep details at 21:00" })).not.toBeInTheDocument();
  });

  it("disables gesture and icon deletion while a mutation is pending", () => {
    render(<EventCards events={[event("sleep-1", 20)]} pending />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-left"));
    expect(screen.queryByText("Delete this event?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("disables swipe editing while a mutation is pending", () => {
    const onEdit = vi.fn();
    render(<EventCards events={[event("sleep-1", 20)]} pending onEdit={onEdit} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-swipe-right"));

    expect(onEdit).not.toHaveBeenCalled();
  });
});
