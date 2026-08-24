import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../types/database";
import {
  getDayWindowStartMinutes,
  updateDayWindowStartMinutes,
} from "./eventRepository";

function readClient(dayWindowStartMinutes: number | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: dayWindowStartMinutes === null
        ? null
        : { day_window_start_minutes: dayWindowStartMinutes },
      error: null,
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient<Database>, query };
}

function writeClient(error: Error | null = null) {
  const query = {
    upsert: vi.fn().mockResolvedValue({ error }),
  };
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient<Database>, from, query };
}

describe("owner-day settings repository", () => {
  afterEach(() => vi.useRealTimers());

  it("loads valid presets and falls back when stored data is unsupported", async () => {
    await expect(getDayWindowStartMinutes(readClient(10 * 60).client, "user-1"))
      .resolves.toBe(10 * 60);
    await expect(getDayWindowStartMinutes(readClient(10 * 60 + 30).client, "user-1"))
      .resolves.toBe(12 * 60);
    await expect(getDayWindowStartMinutes(readClient(null).client, "user-1"))
      .resolves.toBe(12 * 60);
  });

  it("upserts only the selected owner-day start under the authenticated user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
    const { client, from, query } = writeClient();

    await updateDayWindowStartMinutes(client, "user-1", 10 * 60);

    expect(from).toHaveBeenCalledWith("user_settings");
    expect(query.upsert).toHaveBeenCalledWith({
      user_id: "user-1",
      day_window_start_minutes: 10 * 60,
      updated_at: "2026-08-24T12:00:00.000Z",
    }, { onConflict: "user_id" });
  });

  it("rejects unsupported starts before writing and propagates Supabase failures", async () => {
    const invalid = writeClient();
    await expect(updateDayWindowStartMinutes(invalid.client, "user-1", 10 * 60 + 30))
      .rejects.toThrow("INVALID_DAY_WINDOW_START");
    expect(invalid.from).not.toHaveBeenCalled();

    await expect(updateDayWindowStartMinutes(
      writeClient(new Error("write failed")).client,
      "user-1",
      10 * 60
    )).rejects.toThrow("write failed");
  });
});
