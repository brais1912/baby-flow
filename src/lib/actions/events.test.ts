import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Event } from "@/lib/db/schema";

const { findFirstMock, insertValuesMock, insertMock, getUserMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  insertValuesMock: vi.fn().mockResolvedValue(undefined),
  insertMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: { events: { findFirst: findFirstMock } },
    insert: insertMock.mockImplementation(() => ({ values: insertValuesMock })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { createEvent } from "./events";
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
