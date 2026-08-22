import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../types/database";
import { fetchBabyProfile, upsertBabyProfile } from "./profileRepository";

function readClient(result: { data: { baby_name: string | null; baby_date_of_birth: string | null } | null; error: Error | null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient<Database>, from, query };
}

function writeClient(result: { data: { baby_name: string | null; baby_date_of_birth: string | null } | null; error: Error | null }) {
  const query = {
    upsert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  query.upsert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient<Database>, from, query };
}

describe("profileRepository", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for a missing or incomplete profile scoped to the user", async () => {
    const { client, from, query } = readClient({
      data: { baby_name: "Leo", baby_date_of_birth: null },
      error: null,
    });
    await expect(fetchBabyProfile(client, "user-1")).resolves.toBeNull();
    expect(from).toHaveBeenCalledWith("user_settings");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("maps a complete profile", async () => {
    const { client } = readClient({
      data: { baby_name: "Leo", baby_date_of_birth: "2026-05-22" },
      error: null,
    });
    await expect(fetchBabyProfile(client, "user-1")).resolves.toEqual({
      name: "Leo",
      dateOfBirth: "2026-05-22",
    });
  });

  it("upserts only profile fields and preserves unrelated settings", async () => {
    const { client, query } = writeClient({
      data: { baby_name: "Leo", baby_date_of_birth: "2026-05-22" },
      error: null,
    });
    await upsertBabyProfile(client, "user-1", { name: "  Leo  ", dateOfBirth: "2026-05-22" });
    expect(query.upsert).toHaveBeenCalledWith({
      user_id: "user-1",
      baby_name: "Leo",
      baby_date_of_birth: "2026-05-22",
      updated_at: "2026-08-22T12:00:00.000Z",
    }, { onConflict: "user_id" });
    expect(query.upsert.mock.calls[0]?.[0]).not.toHaveProperty("day_window_start_minutes");
  });

  it("propagates read and write errors", async () => {
    const read = readClient({ data: null, error: new Error("read failed") });
    const write = writeClient({ data: null, error: new Error("write failed") });
    await expect(fetchBabyProfile(read.client, "user-1")).rejects.toThrow("read failed");
    await expect(upsertBabyProfile(write.client, "user-1", { name: "Leo", dateOfBirth: "2026-05-22" })).rejects.toThrow("write failed");
  });

  it("rejects invalid profiles before issuing a write", async () => {
    const { client, query } = writeClient({ data: null, error: null });
    await expect(upsertBabyProfile(client, "user-1", { name: "", dateOfBirth: "2027-01-01" })).rejects.toThrow("INVALID_BABY_PROFILE");
    expect(query.upsert).not.toHaveBeenCalled();
  });
});
