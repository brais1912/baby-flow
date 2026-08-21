import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Event } from "@/lib/db/schema";

const { findFirstMock, insertValuesMock, insertMock, deleteWhereMock, deleteMock, updateMock, updateSetMock, updateWhereMock, updateReturningMock, getUserMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  insertValuesMock: vi.fn().mockResolvedValue(undefined),
  insertMock: vi.fn(),
  deleteWhereMock: vi.fn().mockResolvedValue(undefined),
  deleteMock: vi.fn(),
  updateMock: vi.fn(),
  updateSetMock: vi.fn(),
  updateWhereMock: vi.fn(),
  updateReturningMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: { events: { findFirst: findFirstMock } },
    insert: insertMock.mockImplementation(() => ({ values: insertValuesMock })),
    delete: deleteMock.mockImplementation(() => ({ where: deleteWhereMock })),
    update: updateMock.mockImplementation(() => ({ set: updateSetMock })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { createEvent, deleteEvent, updateEvent } from "./events";
import { INVALID_SLEEP_SEQUENCE_PREFIX } from "@/types/events";

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    type: "sleep",
    occurredAt: new Date("2024-01-15T10:00:00"),
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  insertMock.mockImplementation(() => ({ values: insertValuesMock }));
  insertValuesMock.mockResolvedValue(undefined);
  deleteMock.mockImplementation(() => ({ where: deleteWhereMock }));
  deleteWhereMock.mockResolvedValue(undefined);
  updateMock.mockImplementation(() => ({ set: updateSetMock }));
  updateSetMock.mockImplementation(() => ({ where: updateWhereMock }));
  updateWhereMock.mockImplementation(() => ({ returning: updateReturningMock }));
  updateReturningMock.mockResolvedValue([makeEvent({})]);
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("createEvent — sleep sequence validation", () => {
  it("rejects logging sleep when the last sleep-phase event was also sleep", async () => {
    findFirstMock.mockResolvedValue(makeEvent({ type: "sleep" }));

    await expect(
      createEvent({ type: "sleep", occurredAt: new Date(), notes: undefined })
    ).rejects.toThrow(`${INVALID_SLEEP_SEQUENCE_PREFIX}sleep`);

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects logging wake_up when the last sleep-phase event was also wake_up", async () => {
    findFirstMock.mockResolvedValue(makeEvent({ type: "wake_up" }));

    await expect(
      createEvent({ type: "wake_up", occurredAt: new Date(), notes: undefined })
    ).rejects.toThrow(`${INVALID_SLEEP_SEQUENCE_PREFIX}wake_up`);

    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("allows logging wake_up after sleep", async () => {
    findFirstMock.mockResolvedValue(makeEvent({ type: "sleep" }));

    await createEvent({ type: "wake_up", occurredAt: new Date(), notes: undefined });

    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("allows logging sleep after wake_up", async () => {
    findFirstMock.mockResolvedValue(makeEvent({ type: "wake_up" }));

    await createEvent({ type: "sleep", occurredAt: new Date(), notes: undefined });

    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("allows logging sleep when there is no prior sleep-phase event", async () => {
    findFirstMock.mockResolvedValue(undefined);

    await createEvent({ type: "sleep", occurredAt: new Date(), notes: undefined });

    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("does not run sleep-sequence checks for non-sleep event types", async () => {
    await createEvent({ type: "diaper", occurredAt: new Date(), notes: undefined, diaperType: "pee" });

    expect(findFirstMock).not.toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });
});

describe("deleteEvent", () => {
  it("calls db.delete with the event id scoped to the authenticated user", async () => {
    await deleteEvent("event-123");

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(deleteEvent("event-123")).rejects.toThrow("Unauthorized");
    expect(deleteWhereMock).not.toHaveBeenCalled();
  });
});

describe("updateEvent", () => {
  it("updates the given fields scoped to the authenticated user", async () => {
    const existing = makeEvent({ type: "diaper", diaperType: "pee" });
    const updated = { ...existing, occurredAt: new Date("2024-01-15T11:30:00"), updatedAt: new Date("2024-01-15T11:31:00") };
    findFirstMock.mockResolvedValueOnce(existing);
    updateReturningMock.mockResolvedValueOnce([updated]);

    const newTime = new Date("2024-01-15T11:30:00");
    const result = await updateEvent(existing.id, { occurredAt: newTime });

    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith({ occurredAt: newTime, updatedAt: expect.any(Date) });
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
    expect(updateReturningMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(updated);
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(updateEvent("event-123", { occurredAt: new Date() })).rejects.toThrow("Unauthorized");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("throws when the event does not exist for this user", async () => {
    findFirstMock.mockResolvedValueOnce(undefined);

    await expect(updateEvent("event-123", { occurredAt: new Date() })).rejects.toThrow("Event not found");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a sleep event edit that would break the sleep sequence", async () => {
    const existing = makeEvent({ type: "sleep" });
    findFirstMock.mockResolvedValueOnce(existing).mockResolvedValueOnce(makeEvent({ type: "sleep" }));

    await expect(
      updateEvent(existing.id, { occurredAt: new Date("2024-01-15T09:00:00") })
    ).rejects.toThrow(`${INVALID_SLEEP_SEQUENCE_PREFIX}sleep`);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows a sleep event edit when the sequence stays valid", async () => {
    const existing = makeEvent({ type: "sleep" });
    findFirstMock.mockResolvedValueOnce(existing).mockResolvedValueOnce(makeEvent({ type: "wake_up" }));

    await updateEvent(existing.id, { occurredAt: new Date("2024-01-15T09:00:00") });

    expect(updateSetMock).toHaveBeenCalledTimes(1);
  });

  it("revalidates the sequence when the event type changes", async () => {
    const existing = makeEvent({ type: "diaper" });
    findFirstMock.mockResolvedValueOnce(existing).mockResolvedValueOnce(makeEvent({ type: "wake_up" }));

    await expect(
      updateEvent(existing.id, { type: "wake_up" })
    ).rejects.toThrow(`${INVALID_SLEEP_SEQUENCE_PREFIX}wake_up`);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
