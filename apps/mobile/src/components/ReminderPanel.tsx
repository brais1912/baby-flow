import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { format } from "date-fns";
import { Bell, BellOff, Save } from "lucide-react";
import type { useSleepReminder } from "../hooks/useSleepReminder";
import { formatAge } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import {
  DAILY_ENABLED_KEY,
  DAILY_TIME_KEY,
  saveDailyReminder,
} from "../lib/notificationService";
import type { WakeWindowRange } from "../lib/wakeWindow";
import type { BabyProfile } from "../types/profile";

function wakeRangeLabel(range: WakeWindowRange, locale: "en" | "es", t: ReturnType<typeof useI18n>["t"]): string {
  if (range.minMinutes % 60 === 0 && range.maxMinutes % 60 === 0) {
    return t("sleepReminder.rangeHours", {
      min: new Intl.NumberFormat(locale).format(range.minMinutes / 60),
      max: new Intl.NumberFormat(locale).format(range.maxMinutes / 60),
    });
  }
  return t("sleepReminder.rangeMinutes", {
    min: range.minMinutes,
    max: range.maxMinutes,
  });
}

export function ReminderPanel({ profile, sleepReminder }: {
  profile: BabyProfile;
  sleepReminder: ReturnType<typeof useSleepReminder>;
}) {
  const { dateLocale, locale, t } = useI18n();
  const native = Capacitor.isNativePlatform();
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("20:00");
  const [dailyPending, setDailyPending] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [sleepEnabledDraft, setSleepEnabledDraft] = useState<boolean | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);
  const [sleepMessage, setSleepMessage] = useState<string | null>(null);
  const sleepEnabled = sleepEnabledDraft ?? sleepReminder.enabled;
  const threshold = thresholdDraft ?? String(
    sleepReminder.thresholdOverrideMinutes ??
    sleepReminder.recommendation?.minMinutes ??
    ""
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      Preferences.get({ key: DAILY_ENABLED_KEY }),
      Preferences.get({ key: DAILY_TIME_KEY }),
    ]).then(([savedEnabled, savedTime]) => {
      if (!active) return;
      setDailyEnabled(savedEnabled.value === "true");
      if (savedTime.value) setDailyTime(savedTime.value);
    });
    return () => {
      active = false;
    };
  }, []);

  const recommendationLabel = sleepReminder.recommendation
    ? wakeRangeLabel(sleepReminder.recommendation, locale, t)
    : null;
  const stateLines = useMemo(() => {
    const decision = sleepReminder.result?.decision;
    if (!sleepEnabled || !decision) return [t("sleepReminder.disabled")];
    if (decision.kind === "cancel") {
      if (decision.reason === "sleeping") return [t("sleepReminder.sleeping")];
      if (decision.reason === "no-wake") return [t("sleepReminder.noWake")];
      if (decision.reason === "custom-required") return [t("sleepReminder.customRequired")];
      return [t("sleepReminder.disabled")];
    }
    const lines = [
      t("sleepReminder.awakeSince", {
        time: format(decision.wake.occurredAt, "HH:mm", { locale: dateLocale }),
      }),
    ];
    if (decision.kind === "keep" && decision.handled) {
      lines.push(t("sleepReminder.alreadyHandled"));
    } else {
      const nextAt = decision.kind === "schedule" ? decision.scheduleAt : decision.targetAt;
      lines.push(t("sleepReminder.next", {
        time: format(nextAt, "HH:mm", { locale: dateLocale }),
      }));
    }
    return lines;
  }, [dateLocale, sleepEnabled, sleepReminder.result, t]);

  async function saveDaily() {
    setDailyPending(true);
    setDailyMessage(null);
    try {
      await saveDailyReminder(dailyEnabled, dailyTime, locale);
      setDailyMessage(dailyEnabled ? t("reminder.dailyScheduled") : t("reminder.dailyDisabled"));
    } catch (error) {
      if (error instanceof Error && error.message === "NATIVE_NOTIFICATIONS_REQUIRED") {
        setDailyMessage(t("reminder.nativeOnly"));
      } else if (error instanceof Error && error.message === "NOTIFICATION_PERMISSION_DENIED") {
        setDailyEnabled(false);
        setDailyMessage(t("reminder.permissionDenied"));
      } else {
        setDailyMessage(t("reminder.updateError"));
      }
    } finally {
      setDailyPending(false);
    }
  }

  async function saveSleep() {
    setSleepMessage(null);
    if (!sleepEnabled) {
      const saved = await sleepReminder.save(false, sleepReminder.thresholdOverrideMinutes);
      if (saved) {
        setSleepEnabledDraft(null);
        setThresholdDraft(null);
        setSleepMessage(t("sleepReminder.disabled"));
      }
      return;
    }
    if (sleepEnabled && !sleepReminder.recommendation && !threshold) {
      setSleepMessage(t("sleepReminder.customRequired"));
      return;
    }
    const parsed = Number(threshold);
    if (
      !Number.isInteger(parsed) ||
      parsed < 15 ||
      parsed > 720 ||
      parsed % 15 !== 0
    ) {
      setSleepMessage(t("sleepReminder.invalidThreshold"));
      return;
    }
    const override = sleepReminder.recommendation?.minMinutes === parsed
      ? null
      : parsed;
    const saved = await sleepReminder.save(true, override);
    if (saved) {
      setSleepEnabledDraft(null);
      setThresholdDraft(null);
      setSleepMessage(sleepEnabled ? t("sleepReminder.saved") : t("sleepReminder.disabled"));
    }
  }

  const sleepError = sleepReminder.error === "permission"
    ? native ? t("reminder.permissionDenied") : t("reminder.nativeOnly")
    : sleepReminder.error === "generic"
      ? t("reminder.updateError")
      : null;

  return (
    <section className="screen reminders-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{t("reminder.onDevice")}</p>
          <h1>{t("reminder.title")}</h1>
        </div>
        {dailyEnabled || sleepEnabled ? <Bell size={24} /> : <BellOff size={24} />}
      </div>

      <section className="reminder-card">
        <div className="settings-row reminder-toggle">
          <div>
            <strong>{t("reminder.daily")}</strong>
            <span>{dailyEnabled ? t("common.enabled") : t("common.disabled")}</span>
          </div>
          <label className="switch">
            <input type="checkbox" checked={dailyEnabled} onChange={(event) => setDailyEnabled(event.target.checked)} />
            <span />
          </label>
        </div>
        <label className="field-label">
          {t("reminder.dailyTime")}
          <input type="time" value={dailyTime} onChange={(event) => setDailyTime(event.target.value)} disabled={!dailyEnabled} />
        </label>
        {dailyMessage && <p className="state-message" role="status">{dailyMessage}</p>}
        <button className="primary-button" type="button" onClick={() => void saveDaily()} disabled={dailyPending}>
          {dailyPending ? <span className="spinner small" aria-label={t("common.saving")} /> : <Save size={18} />}
          <span>{dailyPending ? t("common.saving") : t("reminder.saveDaily")}</span>
        </button>
      </section>

      <section className="reminder-card sleep-reminder-card">
        <div className="settings-row reminder-toggle">
          <div>
            <strong>{t("sleepReminder.title")}</strong>
            <span>{sleepEnabled ? t("common.enabled") : t("common.disabled")}</span>
          </div>
          <label className="switch">
            <input type="checkbox" checked={sleepEnabled} onChange={(event) => setSleepEnabledDraft(event.target.checked)} />
            <span />
          </label>
        </div>

        <div className="guidance-copy">
          <strong>{t("sleepReminder.age", { age: formatAge(profile.dateOfBirth, locale) })}</strong>
          {recommendationLabel ? (
            <span>{t("sleepReminder.typicalRange", { range: recommendationLabel })}</span>
          ) : (
            <span>{t("sleepReminder.olderContext")}</span>
          )}
          <span>{t("sleepReminder.guidance")}</span>
          <a href="https://health.clevelandclinic.org/wake-windows-by-age" target="_blank" rel="noreferrer">
            {t("sleepReminder.source")}
          </a>
        </div>

        <label className="field-label">
          {t("sleepReminder.alertAfter")}
          <div className="duration-input">
            <input
              type="number"
              min="15"
              max="720"
              step="15"
              value={threshold}
              disabled={!sleepEnabled}
              onChange={(event) => setThresholdDraft(event.target.value)}
            />
            <span>{t("sleepReminder.minutes")}</span>
          </div>
        </label>

        {sleepReminder.recommendation && sleepReminder.thresholdOverrideMinutes !== null && (
          <button className="text-button" type="button" onClick={() => setThresholdDraft(String(sleepReminder.recommendation?.minMinutes ?? ""))}>
            {t("sleepReminder.useRecommendation")}
          </button>
        )}

        <div className="reminder-status" aria-live="polite">
          {stateLines.map((line) => <span key={line}>{line}</span>)}
        </div>
        <p className="reminder-note">{t("sleepReminder.estimate")}</p>
        {sleepReminder.result?.inexactAndroid && <p className="warning-message">{t("sleepReminder.inexactAndroid")}</p>}
        <p className="reminder-note">{t("sleepReminder.otherDeviceLimitation")}</p>
        {(sleepMessage || sleepError) && <p className={sleepError ? "error-banner" : "state-message"} role={sleepError ? "alert" : "status"}>{sleepError ?? sleepMessage}</p>}

        <button className="primary-button" type="button" onClick={() => void saveSleep()} disabled={sleepReminder.saving || !sleepReminder.loaded}>
          {sleepReminder.saving ? <span className="spinner small" aria-label={t("common.saving")} /> : <Save size={18} />}
          <span>{sleepReminder.saving ? t("common.saving") : t("sleepReminder.save")}</span>
        </button>
      </section>
    </section>
  );
}
