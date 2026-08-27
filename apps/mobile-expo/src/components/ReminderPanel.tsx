import { format } from "date-fns";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { useSleepInsights } from "../hooks/useSleepInsights";
import type { useSleepReminder } from "../hooks/useSleepReminder";
import { formatAge } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import {
  isNativePlatform,
  loadDailyReminderPreferences,
  saveDailyReminder,
} from "../lib/notificationService";
import {
  loadSleepNotificationPreferences,
  saveDailySleepSummaryPreference,
  saveTransitionUpdatesPreference,
} from "../lib/sleepNotificationService";
import { mostRecentlyCompletedOwnerDate, ownerDateKey } from "../lib/sleepInsights";
import type { WakeWindowRange } from "../lib/wakeWindow";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import type { BabyProfile } from "../types/profile";
import { AppButton, Banner, Card, Field, TextField, useCoreStyles } from "../ui/Core";
import { TimeField } from "../ui/DateTimeFields";

function wakeRangeLabel(range: WakeWindowRange, locale: "en" | "es", t: ReturnType<typeof useI18n>["t"]): string {
  if (range.minMinutes % 60 === 0 && range.maxMinutes % 60 === 0) {
    return t("sleepReminder.rangeHours", {
      min: new Intl.NumberFormat(locale).format(range.minMinutes / 60),
      max: new Intl.NumberFormat(locale).format(range.maxMinutes / 60),
    });
  }
  return t("sleepReminder.rangeMinutes", { min: range.minMinutes, max: range.maxMinutes });
}

export function ReminderPanel({
  profile,
  sleepReminder,
  sleepInsights,
  bottomContentInset = 0,
}: {
  profile: BabyProfile;
  sleepReminder: ReturnType<typeof useSleepReminder>;
  sleepInsights: ReturnType<typeof useSleepInsights>;
  bottomContentInset?: number;
}) {
  const { dateLocale, locale, t } = useI18n();
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const native = isNativePlatform();
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("20:00");
  const [dailyPending, setDailyPending] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [summaryEnabled, setSummaryEnabled] = useState(false);
  const [summaryTime, setSummaryTime] = useState("20:00");
  const [summaryPending, setSummaryPending] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const [transitionPending, setTransitionPending] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [sleepEnabledDraft, setSleepEnabledDraft] = useState<boolean | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);
  const [sleepMessage, setSleepMessage] = useState<string | null>(null);
  const sleepEnabled = sleepEnabledDraft ?? sleepReminder.enabled;
  const threshold = thresholdDraft ?? String(sleepReminder.thresholdOverrideMinutes ?? sleepReminder.recommendation?.minMinutes ?? "");

  useEffect(() => {
    let active = true;
    void Promise.all([loadDailyReminderPreferences(), loadSleepNotificationPreferences()])
      .then(([saved, sleepNotifications]) => {
        if (!active) return;
        setDailyEnabled(saved.enabled);
        setDailyTime(saved.time);
        setSummaryEnabled(sleepNotifications.summaryEnabled);
        setSummaryTime(sleepNotifications.summaryTime);
        setTransitionEnabled(sleepNotifications.transitionEnabled);
      })
      .catch(() => {
        if (active) setDailyMessage(t("reminder.updateError"));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const completedOwnerDate = mostRecentlyCompletedOwnerDate(new Date(), sleepInsights.startMinutes);
  const completedSummary = sleepInsights.summaries.find(
    (summary) => ownerDateKey(summary.ownerDate) === ownerDateKey(completedOwnerDate)
  ) ?? sleepInsights.summaries[1] ?? sleepInsights.summaries[0];

  const recommendationLabel = sleepReminder.recommendation ? wakeRangeLabel(sleepReminder.recommendation, locale, t) : null;
  const stateLines = useMemo(() => {
    const decision = sleepReminder.result?.decision;
    if (!sleepEnabled || !decision) return [t("sleepReminder.disabled")];
    if (decision.kind === "cancel") {
      if (decision.reason === "sleeping") return [t("sleepReminder.sleeping")];
      if (decision.reason === "no-wake") return [t("sleepReminder.noWake")];
      if (decision.reason === "custom-required") return [t("sleepReminder.customRequired")];
      return [t("sleepReminder.disabled")];
    }
    const lines = [t("sleepReminder.awakeSince", { time: format(decision.wake.occurredAt, "HH:mm", { locale: dateLocale }) })];
    if (decision.kind === "keep" && decision.handled) {
      lines.push(t("sleepReminder.alreadyHandled"));
    } else {
      const nextAt = decision.kind === "schedule" ? decision.scheduleAt : decision.targetAt;
      lines.push(t("sleepReminder.next", { time: format(nextAt, "HH:mm", { locale: dateLocale }) }));
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
    if (!sleepReminder.recommendation && !threshold) {
      setSleepMessage(t("sleepReminder.customRequired"));
      return;
    }
    const parsed = Number(threshold);
    if (!Number.isInteger(parsed) || parsed < 15 || parsed > 720 || parsed % 15 !== 0) {
      setSleepMessage(t("sleepReminder.invalidThreshold"));
      return;
    }
    const override = sleepReminder.recommendation?.minMinutes === parsed ? null : parsed;
    const saved = await sleepReminder.save(true, override);
    if (saved) {
      setSleepEnabledDraft(null);
      setThresholdDraft(null);
      setSleepMessage(t("sleepReminder.saved"));
    }
  }

  async function saveSummary() {
    if (!completedSummary) return;
    setSummaryPending(true);
    setSummaryMessage(null);
    try {
      await saveDailySleepSummaryPreference({
        enabled: summaryEnabled,
        time: summaryTime,
        summary: completedSummary,
        profile,
        locale,
      });
      setSummaryMessage(summaryEnabled
        ? t("sleepNotifications.summarySaved")
        : t("sleepNotifications.summaryDisabled"));
    } catch (error) {
      if (error instanceof Error && error.message === "NOTIFICATION_PERMISSION_DENIED") {
        setSummaryEnabled(false);
        setSummaryMessage(t("reminder.permissionDenied"));
      } else if (error instanceof Error && error.message === "NATIVE_NOTIFICATIONS_REQUIRED") {
        setSummaryMessage(t("reminder.nativeOnly"));
      } else {
        setSummaryMessage(t("reminder.updateError"));
      }
    } finally {
      setSummaryPending(false);
    }
  }

  async function saveTransition() {
    setTransitionPending(true);
    setTransitionMessage(null);
    try {
      await saveTransitionUpdatesPreference(transitionEnabled);
      setTransitionMessage(transitionEnabled
        ? t("sleepNotifications.transitionSaved")
        : t("sleepNotifications.transitionDisabled"));
    } catch (error) {
      if (error instanceof Error && error.message === "NOTIFICATION_PERMISSION_DENIED") {
        setTransitionEnabled(false);
        setTransitionMessage(t("reminder.permissionDenied"));
      } else if (error instanceof Error && error.message === "NATIVE_NOTIFICATIONS_REQUIRED") {
        setTransitionMessage(t("reminder.nativeOnly"));
      } else {
        setTransitionMessage(t("reminder.updateError"));
      }
    } finally {
      setTransitionPending(false);
    }
  }

  const sleepError = sleepReminder.error === "permission"
    ? native ? t("reminder.permissionDenied") : t("reminder.nativeOnly")
    : sleepReminder.error === "generic" ? t("reminder.updateError") : null;

  return (
    <ScrollView
      style={coreStyles.screen}
      contentContainerStyle={[coreStyles.scrollContent, { paddingBottom: bottomContentInset }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={coreStyles.eyebrow}>{t("reminder.onDevice")}</Text>
          <Text style={coreStyles.title}>{t("reminder.title")}</Text>
        </View>
        <Text style={styles.bell}>{dailyEnabled || sleepEnabled ? "🔔" : "🔕"}</Text>
      </View>

      <Card style={styles.cardGap}>
        <ToggleRow label={t("reminder.daily")} enabled={dailyEnabled} onChange={setDailyEnabled} />
        <TimeField label={t("reminder.dailyTime")} value={dailyTime} onChange={setDailyTime} disabled={!dailyEnabled} />
        {dailyMessage ? <Banner tone={dailyMessage === t("reminder.updateError") ? "error" : "neutral"}>{dailyMessage}</Banner> : null}
        <AppButton label={dailyPending ? t("common.saving") : t("reminder.saveDaily")} loading={dailyPending} onPress={() => void saveDaily()} />
      </Card>

      <Card style={styles.cardGap}>
        <ToggleRow label={t("sleepNotifications.summaryTitle")} enabled={summaryEnabled} onChange={setSummaryEnabled} />
        <Text style={coreStyles.body}>{t("sleepNotifications.summaryDescription")}</Text>
        <Text style={coreStyles.muted}>{t("sleepNotifications.generatedDataNote")}</Text>
        <Text style={coreStyles.muted}>{t("sleepNotifications.localOnly")}</Text>
        <TimeField label={t("sleepNotifications.summaryTime")} value={summaryTime} onChange={setSummaryTime} disabled={!summaryEnabled} />
        {summaryMessage ? <Banner tone={summaryMessage === t("reminder.updateError") ? "error" : "neutral"}>{summaryMessage}</Banner> : null}
        <AppButton
          label={summaryPending ? t("common.saving") : t("sleepNotifications.saveSummary")}
          loading={summaryPending}
          disabled={sleepInsights.loading || !completedSummary}
          onPress={() => void saveSummary()}
        />
      </Card>

      <Card style={styles.cardGap}>
        <ToggleRow label={t("sleepNotifications.transitionTitle")} enabled={transitionEnabled} onChange={setTransitionEnabled} />
        <Text style={coreStyles.body}>{t("sleepNotifications.transitionDescription")}</Text>
        <Text style={coreStyles.muted}>{t("sleepNotifications.generatedDataNote")}</Text>
        <Text style={coreStyles.muted}>{t("sleepNotifications.localOnly")}</Text>
        {transitionMessage ? <Banner tone={transitionMessage === t("reminder.updateError") ? "error" : "neutral"}>{transitionMessage}</Banner> : null}
        <AppButton
          label={transitionPending ? t("common.saving") : t("sleepNotifications.saveTransition")}
          loading={transitionPending}
          onPress={() => void saveTransition()}
        />
      </Card>

      <Card style={styles.cardGap}>
        <ToggleRow label={t("sleepReminder.title")} enabled={sleepEnabled} onChange={setSleepEnabledDraft} />
        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>{t("sleepReminder.age", { age: formatAge(profile.dateOfBirth, locale) })}</Text>
          <Text style={coreStyles.body}>{recommendationLabel ? t("sleepReminder.typicalRange", { range: recommendationLabel }) : t("sleepReminder.olderContext")}</Text>
          <Text style={coreStyles.muted}>{t("sleepReminder.guidance")}</Text>
          <AppButton label={t("sleepReminder.source")} tone="text" onPress={() => void Linking.openURL("https://health.clevelandclinic.org/wake-windows-by-age")} />
        </View>
        <Field label={t("sleepReminder.alertAfter")}>
          <TextField accessibilityLabel={t("sleepReminder.alertAfter")} editable={sleepEnabled} keyboardType="number-pad" value={threshold} onChangeText={setThresholdDraft} />
          <Text style={coreStyles.muted}>{t("sleepReminder.minutes")}</Text>
        </Field>
        {sleepReminder.recommendation && sleepReminder.thresholdOverrideMinutes !== null ? (
          <AppButton label={t("sleepReminder.useRecommendation")} tone="text" onPress={() => setThresholdDraft(String(sleepReminder.recommendation?.minMinutes ?? ""))} />
        ) : null}
        <View style={styles.status} accessibilityLiveRegion="polite">
          {stateLines.map((line) => <Text key={line} style={styles.statusLine}>{line}</Text>)}
        </View>
        <Text style={coreStyles.muted}>{t("sleepReminder.estimate")}</Text>
        {sleepReminder.result?.inexactAndroid ? <Banner tone="warning">{t("sleepReminder.inexactAndroid")}</Banner> : null}
        <Text style={coreStyles.muted}>{t("sleepReminder.otherDeviceLimitation")}</Text>
        {sleepMessage || sleepError ? <Banner tone={sleepError ? "error" : "neutral"}>{sleepError ?? sleepMessage}</Banner> : null}
        <AppButton label={sleepReminder.saving ? t("common.saving") : t("sleepReminder.save")} loading={sleepReminder.saving} disabled={!sleepReminder.loaded} onPress={() => void saveSleep()} />
      </Card>
    </ScrollView>
  );
}

function ToggleRow({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (value: boolean) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={coreStyles.muted}>{enabled ? t("common.enabled") : t("common.disabled")}</Text>
      </View>
      <Switch accessibilityLabel={label} value={enabled} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.switchTrack }} thumbColor={enabled ? colors.primary : colors.switchThumb} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  headingCopy: { gap: 4 },
  bell: { fontSize: 27 },
  cardGap: { gap: 15 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleCopy: { gap: 2 },
  toggleTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  guidance: { gap: 8, borderRadius: 15, backgroundColor: colors.primarySoft, padding: 14 },
  guidanceTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: "800" },
  status: { gap: 4, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 13 },
  statusLine: { color: colors.text, fontSize: 13, lineHeight: 18 },
  });
}
