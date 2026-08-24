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
  onOpen = vi.fn(),
  onDelete = vi.fn().mockResolvedValue(undefined),
}: {
  events: BabyEvent[];
  pending?: boolean;
  onOpen?: (event: BabyEvent) => void;
  onDelete?: (eventId: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return events.map((item) => (
    <EventCard
      key={item.id}
      event={item}
      allEvents={events}
      pending={pending}
      swipeOpen={openId === item.id}
      onOpen={onOpen}
      onEdit={vi.fn()}
      onDelete={onDelete}
      onDeleteRequest={() => setOpenId(null)}
      onSwipeOpen={setOpenId}
      onSwipeClose={(eventId) => setOpenId((current) => current === eventId ? null : current)}
    />
  ));
}

describe("EventCard swipe deletion", () => {
  it("reveals Delete without deleting and closes instead of opening details when the row is tapped", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EventCards events={[event("sleep-1", 20)]} onOpen={onOpen} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-open"));
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Open Sleep details at 20:00" }));
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("reuses the existing confirmation and only deletes after explicit confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EventCards events={[event("sleep-1", 20)]} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-open"));
    await user.click(screen.getByText("Delete"));
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

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-open"));
    await user.click(screen.getByText("Delete"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete this event?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Sleep details at 20:00" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps only one row revealed", () => {
    render(<EventCards events={[event("sleep-1", 20), event("sleep-2", 21)]} />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-open"));
    expect(screen.getAllByText("Delete")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("event-swipe-sleep-2-open"));
    expect(screen.getAllByText("Delete")).toHaveLength(1);
  });

  it("disables gesture and icon deletion while a mutation is pending", () => {
    render(<EventCards events={[event("sleep-1", 20)]} pending />);

    fireEvent.click(screen.getByTestId("event-swipe-sleep-1-open"));
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
