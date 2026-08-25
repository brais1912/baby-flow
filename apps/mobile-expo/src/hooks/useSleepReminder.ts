import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import {
  cancelSleepReminder,
  isNativePlatform,
  loadSleepReminderPreferences,
  notificationPermission,
  reconcileSleepReminder,
  storeSleepReminderPreferences,
  type ReconcileResult,
  type SleepReminderPreferences,
} from "../lib/notificationService";
import { wakeWindowRecommendation } from "../lib/wakeWindow";
import type { BabyEvent } from "../types/events";
import type { BabyProfile } from "../types/profile";

export function useSleepReminder({ profile, event, ready }: {
  profile: BabyProfile;
  event: BabyEvent | null;
  ready: boolean;
}) {
  const { locale } = useI18n();
  const [preferences, setPreferences] = useState<SleepReminderPreferences>({
    enabled: false,
    thresholdOverrideMinutes: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<"permission" | "generic" | null>(null);
  const reconcileQueue = useRef<Promise<void>>(Promise.resolve());
  const recommendation = wakeWindowRecommendation(profile.dateOfBirth);

  useEffect(() => {
    let active = true;
    void loadSleepReminderPreferences()
      .then((saved) => {
        if (active) setPreferences(saved);
      })
      .catch(() => {
        if (active) setError("generic");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const reconcile = useCallback((nextPreferences = preferences) => {
    const run = async () => {
      try {
        const nextResult = await reconcileSleepReminder({
          preferences: nextPreferences,
          profile,
          events: event ? [event] : [],
          locale,
        });
        setResult(nextResult);
        if (nextResult.permissionDenied && nextPreferences.enabled) {
          const disabled = { ...nextPreferences, enabled: false };
          setPreferences(disabled);
          await storeSleepReminderPreferences(disabled);
          setError("permission");
        } else {
          setError(null);
        }
      } catch {
        setError("generic");
      }
    };
    const queued = reconcileQueue.current.then(run, run);
    reconcileQueue.current = queued;
    return queued;
  }, [event, locale, preferences, profile]);

  useEffect(() => {
    let active = true;
    if (loaded && ready) {
      queueMicrotask(() => {
        if (active) void reconcile();
      });
    }
    return () => {
      active = false;
    };
  }, [loaded, ready, reconcile]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && ready) void reconcile();
    });
    return () => listener.remove();
  }, [ready, reconcile]);

  const save = useCallback(async (enabled: boolean, thresholdOverrideMinutes: number | null) => {
    setSaving(true);
    setError(null);
    let next: SleepReminderPreferences = { enabled, thresholdOverrideMinutes };
    try {
      if (enabled) {
        if (!isNativePlatform() || !await notificationPermission(true)) {
          next = { ...next, enabled: false };
          await storeSleepReminderPreferences(next);
          setPreferences(next);
          await cancelSleepReminder();
          setError("permission");
          return false;
        }
      }
      await storeSleepReminderPreferences(next);
      setPreferences(next);
      await reconcile(next);
      return true;
    } catch {
      setError("generic");
      return false;
    } finally {
      setSaving(false);
    }
  }, [reconcile]);

  return {
    loaded,
    saving,
    enabled: preferences.enabled,
    thresholdOverrideMinutes: preferences.thresholdOverrideMinutes,
    recommendation,
    result,
    error,
    save,
    reconcile,
  };
}
