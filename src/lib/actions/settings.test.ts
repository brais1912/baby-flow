import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirstMock, insertMock, valuesMock, onConflictDoUpdateMock, getUserMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  onConflictDoUpdateMock: vi.fn().mockResolvedValue(undefined),
  getUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    query: { userSettings: { findFirst: findFirstMock } },
    insert: insertMock.mockImplementation(() => ({
      values: valuesMock.mockImplementation(() => ({
        onConflictDoUpdate: onConflictDoUpdateMock,
      })),
    })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { getDayWindowStartMinutes, updateDayWindowStartMinutes } from "./settings";

beforeEach(() => {
  vi.clearAllMocks();
  findFirstMock.mockResolvedValue(undefined);
  insertMock.mockImplementation(() => ({
    values: valuesMock.mockImplementation(() => ({
      onConflictDoUpdate: onConflictDoUpdateMock,
    })),
  }));
  onConflictDoUpdateMock.mockResolvedValue(undefined);
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("getDayWindowStartMinutes", () => {
  it("returns the saved setting", async () => {
    findFirstMock.mockResolvedValue({ userId: "user-1", dayWindowStartMinutes: 480 });

    await expect(getDayWindowStartMinutes()).resolves.toBe(480);
  });

  it("returns noon by default when no settings row exists", async () => {
    await expect(getDayWindowStartMinutes()).resolves.toBe(720);
  });

  it("returns noon by default when the saved setting is no longer allowed", async () => {
    findFirstMock.mockResolvedValue({ userId: "user-1", dayWindowStartMinutes: 360 });

    await expect(getDayWindowStartMinutes()).resolves.toBe(720);
  });

  it("returns noon by default when the settings table has not been migrated yet", async () => {
    findFirstMock.mockRejectedValue(Object.assign(new Error("relation does not exist"), { code: "42P01" }));

    await expect(getDayWindowStartMinutes()).resolves.toBe(720);
  });

  it("returns noon by default when Drizzle wraps the missing settings table error", async () => {
    findFirstMock.mockRejectedValue(new Error("Failed query", {
      cause: Object.assign(new Error('relation "user_settings" does not exist'), { code: "42P01" }),
    }));

    await expect(getDayWindowStartMinutes()).resolves.toBe(720);
  });

  it("rethrows other settings query failures", async () => {
    findFirstMock.mockRejectedValue(Object.assign(new Error("connection failed"), { code: "08006" }));

    await expect(getDayWindowStartMinutes()).rejects.toThrow("connection failed");
  });
});

describe("updateDayWindowStartMinutes", () => {
  it("upserts the authenticated user's setting", async () => {
    await expect(updateDayWindowStartMinutes(480)).resolves.toEqual({ persisted: true });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith({ userId: "user-1", dayWindowStartMinutes: 480 });
    expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("returns not persisted when the settings table has not been migrated yet", async () => {
    onConflictDoUpdateMock.mockRejectedValue(new Error("Failed query", {
      cause: Object.assign(new Error('relation "user_settings" does not exist'), { code: "42P01" }),
    }));

    await expect(updateDayWindowStartMinutes(480)).resolves.toEqual({ persisted: false });
  });

  it("rejects out-of-range minute values", async () => {
    await expect(updateDayWindowStartMinutes(1440)).rejects.toThrow("Invalid day window start time");

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects minute values outside the allowed presets", async () => {
    await expect(updateDayWindowStartMinutes(450)).rejects.toThrow("Invalid day window start time");

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("throws Unauthorized when there is no authenticated user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: new Error("no user") });

    await expect(updateDayWindowStartMinutes(480)).rejects.toThrow("Unauthorized");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rethrows other settings write failures", async () => {
    onConflictDoUpdateMock.mockRejectedValue(Object.assign(new Error("connection failed"), { code: "08006" }));

    await expect(updateDayWindowStartMinutes(480)).rejects.toThrow("connection failed");
  });
});
