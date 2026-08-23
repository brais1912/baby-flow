import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AppState } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import {
  adjacentOwnerDay,
  dashboardFetchBounds,
  eventsWithinOwnerDay,
  isTodayOwner,
} from "../lib/dashboard";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchLatestSleepPhase,
  getDayWindowStartMinutes,
  updateEventTime,
} from "../lib/eventRepository";
import { dayWindowDate, eventReducer, initialEventState } from "../lib/events";
import { supabase } from "../lib/supabase";
import type { BabyEvent, EventInput } from "../types/events";

function errorMessage(error: unknown, sleeping: string, awake: string, generic: string): string {
  if (error instanceof Error && error.message.startsWith("INVALID_SLEEP_SEQUENCE:sleep")) {
    return sleeping;
  }
  if (error instanceof Error && error.message.startsWith("INVALID_SLEEP_SEQUENCE:wake_up")) {
    return awake;
  }
  return generic;
}

async function loadDashboardEvents(userId: string, ownerDate: Date, startMinutes: number) {
  const { start, end } = dashboardFetchBounds(ownerDate, startMinutes);
  return fetchEvents(supabase, userId, start, end);
}

export function useEvents(userId: string) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(eventReducer, initialEventState);
  const [dayWindowStartMinutes, setDayWindowStartMinutes] = useState(720);
  const [selectedDay, setSelectedDay] = useState(() => dayWindowDate(new Date(), 720));
  const [sleepPhase, setSleepPhase] = useState<BabyEvent | null>(null);
  const [sleepPhaseReady, setSleepPhaseReady] = useState(false);
  const requestId = useRef(0);

  const message = useCallback((error: unknown) => errorMessage(
    error,
    t("dashboard.alreadySleeping"),
    t("dashboard.alreadyAwake"),
    t("dashboard.genericError")
  ), [t]);

  const refreshSleepPhase = useCallback(async () => {
    try {
      setSleepPhase(await fetchLatestSleepPhase(supabase, userId));
      setSleepPhaseReady(true);
    } catch {
      return;
    }
  }, [userId]);

  const loadOwnerDay = useCallback(async (ownerDate: Date, startMinutes: number) => {
    const currentRequest = ++requestId.current;
    dispatch({ type: "load-start" });
    try {
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (currentRequest !== requestId.current) return;
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
      void refreshSleepPhase();
    } catch (error) {
      if (currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    }
  }, [message, refreshSleepPhase, userId]);

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
      void refreshSleepPhase();
    } catch (error) {
      if (currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    }
  }, [dayWindowStartMinutes, message, refreshSleepPhase, selectedDay, userId]);

  const refreshToday = useCallback(async () => {
    const currentRequest = ++requestId.current;
    dispatch({ type: "load-start" });
    try {
      const startMinutes = await getDayWindowStartMinutes(supabase, userId);
      const ownerDate = dayWindowDate(new Date(), startMinutes);
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (currentRequest !== requestId.current) return;
      setDayWindowStartMinutes(startMinutes);
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
      void refreshSleepPhase();
    } catch (error) {
      if (currentRequest === requestId.current) dispatch({ type: "error", message: message(error) });
    }
  }, [message, refreshSleepPhase, userId]);

  useEffect(() => {
    let active = true;
    const currentRequest = ++requestId.current;
    void getDayWindowStartMinutes(supabase, userId).then(async (startMinutes) => {
      const ownerDate = dayWindowDate(new Date(), startMinutes);
      const events = await loadDashboardEvents(userId, ownerDate, startMinutes);
      if (!active || currentRequest !== requestId.current) return;
      setDayWindowStartMinutes(startMinutes);
      setSelectedDay(ownerDate);
      dispatch({ type: "load-success", events });
    }).catch((error: unknown) => {
      if (active && currentRequest === requestId.current) {
        dispatch({ type: "error", message: message(error) });
      }
    });
    return () => {
      active = false;
    };
  }, [message, userId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refreshSleepPhase();
    });
    return () => {
      active = false;
    };
  }, [refreshSleepPhase]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshSleepPhase();
    });
    return () => listener.remove();
  }, [refreshSleepPhase]);

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
      await refreshSleepPhase();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      return created;
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      throw error;
    }
  }, [dayWindowStartMinutes, message, refreshSleepPhase, selectedDay, userId]);

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
      await refreshSleepPhase();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return updated;
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      throw error;
    }
  }, [dayWindowStartMinutes, message, refreshSleepPhase, selectedDay, userId]);

  const remove = useCallback(async (eventId: string) => {
    dispatch({ type: "mutation-start" });
    try {
      await deleteEvent(supabase, userId, eventId);
      dispatch({ type: "remove", eventId });
      await refreshSleepPhase();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      dispatch({ type: "error", message: message(error) });
      throw error;
    }
  }, [message, refreshSleepPhase, userId]);

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
    sleepPhase,
    sleepPhaseReady,
    dayEvents,
    selectedDay,
    dayWindowStartMinutes,
    isToday: isTodayOwner(selectedDay, dayWindowStartMinutes),
    reload,
    refreshToday,
    selectAdjacentDay,
    goToToday,
    create,
    updateTime,
    remove,
  };
}
