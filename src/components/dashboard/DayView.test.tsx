import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/lib/db/schema";
import { DayView } from "./DayView";

const { deleteEventMock, refreshMock, updateEventMock } = vi.hoisted(() => ({
  deleteEventMock: vi.fn(),
  refreshMock: vi.fn(),
  updateEventMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div>timeline</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) => (
    values?.count === undefined ? key : `${key}:${values.count}`
  ),
  useLocale: () => "en",
}));

vi.mock("@/lib/actions/events", () => ({
  deleteEvent: deleteEventMock,
  updateEvent: updateEventMock,
}));

vi.mock("@/components/events/EventEditSheet", () => ({
  EventEditSheet: ({ onSubmit }: { onSubmit: (occurredAt: Date) => Promise<void> }) => (
    <button type="button" onClick={() => onSubmit(new Date("2024-03-15T14:00:00"))}>
      submit-edit
    </button>
  ),
}));

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    userId: "user-1",
    type: "feeding",
    occurredAt: new Date("2024-03-15T13:00:00"),
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: "bottle",
    feedingAmountMl: 120,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: new Date("2024-03-15T13:00:00"),
    updatedAt: new Date("2024-03-15T13:00:00"),
    ...overrides,
  };
}

describe("DayView mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteEventMock.mockResolvedValue(undefined);
  });

  it("reports successful edits and deletions to the dashboard", async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    const updatedEvent = makeEvent({
      occurredAt: new Date("2024-03-15T14:00:00"),
      updatedAt: new Date("2024-03-15T14:01:00"),
    });
    updateEventMock.mockResolvedValue(updatedEvent);
    const onEventUpdated = vi.fn();
    const onEventDeleted = vi.fn();

    render(
      <DayView
        events={[event]}
        currentDay={new Date("2024-03-15T00:00:00")}
        onEventUpdated={onEventUpdated}
        onEventDeleted={onEventDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "editEvent" }));
    await user.click(screen.getByRole("button", { name: "submit-edit" }));

    expect(updateEventMock).toHaveBeenCalledWith(event.id, { occurredAt: new Date("2024-03-15T14:00:00") });
    expect(onEventUpdated).toHaveBeenCalledWith(updatedEvent);

    await user.click(screen.getByRole("button", { name: "Delete event" }));
    await user.click(screen.getByRole("button", { name: "deleteConfirmButton" }));

    expect(deleteEventMock).toHaveBeenCalledWith(event.id);
    expect(onEventDeleted).toHaveBeenCalledWith(event.id);
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});
