import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { fetchEvents } from "../lib/eventRepository";
import { dayWindowDate, ownerDayWindowBounds } from "../lib/events";
import {
  buildSleepHistory,
  INSIGHTS_HISTORY_DAYS,
} from "../lib/sleepInsights";
import { supabase } from "../lib/supabase";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";

function shiftDay(date: Date, amount: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  shifted.setHours(0, 0, 0, 0);
  return shifted;
}

export function useSleepInsights({
  userId,
  profile,
  startMinutes,
  refreshToken,
}: {
  userId: string;
  profile: BabyProfile;
  startMinutes: number;
  refreshToken: number;
}) {
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const latestOwnerDate = useMemo(() => dayWindowDate(new Date(), startMinutes), [startMinutes]);

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);
    const earliestOwnerDate = shiftDay(latestOwnerDate, -INSIGHTS_HISTORY_DAYS);
    const start = ownerDayWindowBounds(earliestOwnerDate, startMinutes).start;
    const end = ownerDayWindowBounds(latestOwnerDate, startMinutes).end;
    try {
      const loaded = await fetchEvents(supabase, userId, start, end);
      if (requestId.current !== currentRequest) return;
      setEvents(loaded);
    } catch {
      if (requestId.current === currentRequest) setError(true);
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [latestOwnerDate, startMinutes, userId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void reload();
    });
    return () => {
      active = false;
    };
  }, [refreshToken, reload]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void reload();
    });
    return () => listener.remove();
  }, [reload]);

  const summaries = useMemo(() => buildSleepHistory({
    events,
    latestOwnerDate,
    startMinutes,
    dateOfBirth: profile.dateOfBirth,
  }), [events, latestOwnerDate, profile.dateOfBirth, startMinutes]);

  return { summaries, events, latestOwnerDate, startMinutes, loading, error, reload };
}
