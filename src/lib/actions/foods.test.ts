import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FoodEntry } from "@/lib/db/schema";

const { getUserMock, insertValuesMock, insertMock, updateMock, updateSetMock, updateWhereMock, deleteMock, deleteWhereMock, findManyMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  insertValuesMock: vi.fn().mockResolvedValue(undefined),
  insertMock: vi.fn(),
  updateSetMock: vi.fn(),
  updateWhereMock: vi.fn().mockResolvedValue(undefined),
  updateMock: vi.fn(),
  deleteWhereMock: vi.fn().mockResolvedValue(undefined),
  deleteMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: { foodEntries: { findMany: findManyMock } },
    insert: insertMock.mockImplementation(() => ({ values: insertValuesMock })),
    update: updateMock.mockImplementation(() => ({ set: updateSetMock })),
    delete: deleteMock.mockImplementation(() => ({ where: deleteWhereMock })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { createFoodEntry, updateFoodEntry, deleteFoodEntry, getFoodEntries } from "./foods";

function makeEntry(overrides: Partial<FoodEntry>): FoodEntry {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    name: "Banana",
    category: "fruit",
    amount: null,
    eatenAt: new Date("2026-06-15T10:00:00"),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function validInput(eatenAt = new Date("2026-06-15T10:00:00")) {
  return { name: "Banana", category: "fruit" as const, eatenAt };
}

beforeEach(() => {
  vi.clearAllMocks();
  insertMock.mockImplementation(() => ({ values: insertValuesMock }));
  insertValuesMock.mockResolvedValue(undefined);
  updateMock.mockImplementation(() => ({ set: updateSetMock }));
  updateSetMock.mockImplementation(() => ({ where: updateWhereMock }));
  updateWhereMock.mockResolvedValue(undefined);
  deleteMock.mockImplementation(() => ({ where: deleteWhereMock }));
  deleteWhereMock.mockResolvedValue(undefined);
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("createFoodEntry", () => {
  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(createFoodEntry(validInput())).rejects.toThrow("Unauthorized");
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("inserts the entry with the authenticated user id", async () => {
    await createFoodEntry(validInput());

    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", name: "Banana", category: "fruit" })
    );
  });

  it("rejects an empty name", async () => {
    await expect(createFoodEntry({ name: "   ", eatenAt: new Date() })).rejects.toThrow();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid category", async () => {
    await expect(
      createFoodEntry({ name: "Banana", category: "sushi" as never, eatenAt: new Date() })
    ).rejects.toThrow();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid eatenAt", async () => {
    await expect(createFoodEntry({ name: "Banana", eatenAt: new Date("nope") })).rejects.toThrow();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("strips undefined optionals before inserting", async () => {
    await createFoodEntry(validInput());

    const call = insertValuesMock.mock.calls[0][0];
    expect(call.amount).toBeUndefined();
    expect(call.notes).toBeUndefined();
  });
});

describe("updateFoodEntry", () => {
  it("updates scoped to the authenticated user's entry", async () => {
    await updateFoodEntry("entry-123", validInput());

    expect(updateSetMock).toHaveBeenCalledTimes(1);
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(updateFoodEntry("entry-123", validInput())).rejects.toThrow("Unauthorized");
    expect(updateWhereMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the DB", async () => {
    await expect(
      updateFoodEntry("entry-123", { name: "", eatenAt: new Date() })
    ).rejects.toThrow();
    expect(updateWhereMock).not.toHaveBeenCalled();
  });
});

describe("deleteFoodEntry", () => {
  it("deletes scoped to the authenticated user's entry", async () => {
    await deleteFoodEntry("entry-123");

    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(deleteFoodEntry("entry-123")).rejects.toThrow("Unauthorized");
    expect(deleteWhereMock).not.toHaveBeenCalled();
  });
});

describe("getFoodEntries", () => {
  it("queries the authenticated user's entries ordered by eatenAt desc", async () => {
    findManyMock.mockResolvedValue([makeEntry({})]);

    const entries = await getFoodEntries();

    expect(entries).toHaveLength(1);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expect.any(Array) })
    );
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(getFoodEntries()).rejects.toThrow("Unauthorized");
    expect(findManyMock).not.toHaveBeenCalled();
  });
});