import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { BabyEvent, EventInput } from "../types/events";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  getDayWindowStartMinutes,
  updateEventTime,
} from "../lib/eventRepository";
import {
  adjacentOwnerDay,
  dashboardFetchBounds,
  eventsWithinOwnerDay,
  isTodayOwner,
} from "../lib/dashboard";
import { dayWindowDate, eventReducer, initialEventState } from "../lib/events";
import { supabase } from "../lib/supabase";

function message(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("INVALID_SLEEP_SEQUENCE:sleep")) {
    return "The baby is already sleeping.";
  }
  if (error instanceof Error && error.message.startsWith("INVALID_SLEEP_SEQUENCE:wake_up")) {
    return "The baby is already awake.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function loadDashboardEvents(userId: string, ownerDate: Date, startMinutes: number) {
  const { start, end } = dashboardFetchBounds(ownerDate, startMinutes);
  const events = await fetchEvents(supabase, userId, start, end);
  return events;
}

export function useEvents(userId: string) {
  const [state, dispatch] = useReducer(eventReducer, initialEventState);
  const [dayWindowStartMinutes, setDayWindowStartMinutes] = useState(720);
  const [selectedDay, setSelectedDay] = useState(() => dayWindowDate(new Date(), 720));
  const requestId = useRef(0);

  const loadOwnerDay = useCallback(async (ownerDate: Date, startMinutes: number) => {
    const currentRequest = ++requestId.current;
    dispatch({ type: "load-start" });
    try {
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (currentRequest !== requestId.current) return;
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
    } catch (error) {
      if (currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    }
  }, [userId]);

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current;
    dispatch({ type: "load-start" });
    try {
      const startMinutes = await getDayWindowStartMinutes(supabase, userId);
      const ownerDate = isTodayOwner(selectedDay, dayWindowStartMinutes)
        ? dayWindowDate(new Date(), startMinutes)
        : selectedDay;
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (currentRequest !== requestId.current) return;
      setDayWindowStartMinutes(startMinutes);
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
    } catch (error) {
      if (currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    }
  }, [dayWindowStartMinutes, selectedDay, userId]);

  useEffect(() => {
    let active = true;
    const currentRequest = ++requestId.current;
    void getDayWindowStartMinutes(supabase, userId).then(async (startMinutes) => {
      const ownerDate = dayWindowDate(new Date(), startMinutes);
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (!active) return;
      setDayWindowStartMinutes(startMinutes);
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
    }).catch((error: unknown) => {
      if (active && currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const create = useCallback(async (input: EventInput) => {
    dispatch({ type: "mutation-start" });
    try {
      const created = await createEvent(supabase, userId, input);
      const { start, end } = dashboardFetchBounds(selectedDay, dayWindowStartMinutes);
      dispatch(
        created.occurredAt >= start && created.occurredAt < end
          ? { type: "upsert", event: created }
          : { type: "mutation-success" }
      );
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
      return created;
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
      throw error;
    }
  }, [dayWindowStartMinutes, selectedDay, userId]);

  const updateTime = useCallback(async (event: BabyEvent, occurredAt: Date) => {
    dispatch({ type: "mutation-start" });
    try {
      const updated = await updateEventTime(supabase, userId, event, occurredAt);
      const { start, end } = dashboardFetchBounds(selectedDay, dayWindowStartMinutes);
      dispatch(
        updated.occurredAt >= start && updated.occurredAt < end
          ? { type: "upsert", event: updated }
          : { type: "remove", eventId: updated.id }
      );
      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      return updated;
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      throw error;
    }
  }, [dayWindowStartMinutes, selectedDay, userId]);

  const remove = useCallback(async (eventId: string) => {
    dispatch({ type: "mutation-start" });
    try {
      await deleteEvent(supabase, userId, eventId);
      dispatch({ type: "remove", eventId });
      await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      throw error;
    }
  }, [userId]);

  const dayEvents = useMemo(
    () => eventsWithinOwnerDay(state.events, selectedDay, dayWindowStartMinutes),
    [dayWindowStartMinutes, selectedDay, state.events]
  );

  const selectAdjacentDay = useCallback(async (offset: -1 | 1) => {
    const nextDay = adjacentOwnerDay(selectedDay, offset);
    if (offset === 1 && nextDay > dayWindowDate(new Date(), dayWindowStartMinutes)) return;
    await loadOwnerDay(nextDay, dayWindowStartMinutes);
  }, [dayWindowStartMinutes, loadOwnerDay, selectedDay]);

  const goToToday = useCallback(async () => {
    await loadOwnerDay(dayWindowDate(new Date(), dayWindowStartMinutes), dayWindowStartMinutes);
  }, [dayWindowStartMinutes, loadOwnerDay]);

  return {
    ...state,
    dayEvents,
    selectedDay,
    dayWindowStartMinutes,
    isToday: isTodayOwner(selectedDay, dayWindowStartMinutes),
    reload,
    selectAdjacentDay,
    goToToday,
    create,
    updateTime,
    remove,
  };
}
