import { format } from "date-fns";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatNaturalDuration } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import { eventPhaseDuration } from "../lib/eventDurations";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import type { BabyEvent } from "../types/events";
import { ChartDetailDialog } from "../ui/ChartDetailDialog";
import { AppButton } from "../ui/Core";

type EventPresentation = Record<BabyEvent["type"], {
  icon: string;
  label: MessageKey;
  tone: "sleep" | "feeding" | "diaper" | "neutral";
  summaryBackground: string;
}>;

const detailLabelKeys: Partial<Record<string, MessageKey>> = {
  breast_left: "event.leftBreast",
  breast_right: "event.rightBreast",
  both_breasts: "event.bothBreasts",
  bottle: "event.bottle",
  formula: "event.formula",
  solid: "event.solid",
  pee: "event.pee",
  poop: "event.poop",
  both: "event.both",
  self: "event.self",
  nursing: "event.nursing",
  pacifier: "event.pacifier",
  held: "event.held",
  rocking: "event.rocking",
  sleep_sack: "event.sleepSack",
  pajamas: "event.pajamas",
  bodysuit: "event.bodysuit",
  top_and_bottoms: "event.topAndBottoms",
  swaddle: "event.swaddle",
  other: "common.other",
};

export function EventDetailSheet({
  visible,
  event,
  allEvents,
  babyName,
  pairedWake = null,
  onClose,
  onEdit,
}: {
  visible: boolean;
  event: BabyEvent;
  allEvents: BabyEvent[];
  babyName: string;
  pairedWake?: BabyEvent | null;
  onClose: () => void;
  onEdit?: (event: BabyEvent) => void;
}) {
  const { dateLocale, locale, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const eventPresentation: EventPresentation = {
    sleep: { icon: "😴", label: "event.sleep", tone: "sleep", summaryBackground: colors.sleepSoft },
    wake_up: { icon: "🌅", label: "event.wake", tone: "neutral", summaryBackground: colors.awakeSoft },
    feeding: { icon: "🍼", label: "event.feed", tone: "feeding", summaryBackground: colors.feedingSoft },
    diaper: { icon: "👶", label: "event.diaper", tone: "diaper", summaryBackground: colors.diaperSoft },
  };
  const presentation = eventPresentation[event.type];
  const time = format(event.occurredAt, "HH:mm", { locale: dateLocale });
  const phase = eventPhaseDuration(event, allEvents);
  const phaseDuration = phase ? formatNaturalDuration(phase.durationMs, locale) : null;
  const pairedDuration = pairedWake
    ? formatNaturalDuration(pairedWake.occurredAt.getTime() - event.occurredAt.getTime(), locale)
    : null;
  const pairedTime = pairedWake ? format(pairedWake.occurredAt, "HH:mm", { locale: dateLocale }) : null;
  const details: string[] = [];

  if (event.type === "feeding" && event.feedingType) details.push(t(detailLabelKeys[event.feedingType] ?? "common.other"));
  if (event.type === "feeding" && event.feedingAmountMl) details.push(`${event.feedingAmountMl} ml`);
  if (event.type === "feeding" && event.feedingDurationMinutes) details.push(t("duration.minutes", { count: event.feedingDurationMinutes }));
  if (event.type === "diaper" && event.diaperType) details.push(t(detailLabelKeys[event.diaperType] ?? "common.other"));
  if (event.type === "sleep" && event.sleepMethod) details.push(t(detailLabelKeys[event.sleepMethod] ?? "common.other"));
  if (event.type === "sleep" && event.sleepCondition) details.push(t(detailLabelKeys[event.sleepCondition] ?? "common.other"));
  if (event.type === "sleep" && event.sleepRoomTemperature !== null) details.push(`${event.sleepRoomTemperature}°C`);

  const summary = event.type === "sleep" && pairedWake && pairedDuration && pairedTime
    ? t("event.summary.sleepSession", { name: babyName, duration: pairedDuration, start: time, end: pairedTime })
    : event.type === "sleep" && phase?.kind === "awake" && phaseDuration
      ? t("event.summary.awakeBeforeSleep", { name: babyName, duration: phaseDuration, time })
      : event.type === "wake_up" && phase?.kind === "sleep" && phaseDuration
        ? t("event.summary.sleepBeforeWake", { name: babyName, duration: phaseDuration, time })
        : event.type === "sleep"
          ? t("event.summary.sleepStart", { name: babyName, time })
          : event.type === "wake_up"
            ? t("event.summary.wake", { name: babyName, time })
            : event.type === "feeding"
              ? t("event.summary.feeding", { name: babyName, time })
              : t("event.summary.diaper", { name: babyName, time });
  const notes = event.notes && event.notes !== "QuickLog" ? event.notes : null;

  return (
    <ChartDetailDialog
      visible={visible}
      eyebrow={t("chart.eventDetails")}
      icon={presentation.icon}
      subtitle={format(event.occurredAt, "EEEE, d MMMM yyyy", { locale: dateLocale })}
      title={t(presentation.label)}
      tone={presentation.tone}
      onClose={onClose}
    >
      <View style={[styles.summaryCard, { backgroundColor: presentation.summaryBackground }]}>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      {details.length > 0 ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>{t("chart.recordedDetails")}</Text>
          <View style={styles.detailPills}>
            {details.map((detail) => <View key={detail} style={styles.detailPill}><Text style={styles.detailPillText}>{detail}</Text></View>)}
          </View>
        </View>
      ) : null}
      {notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.detailLabel}>{t("chart.notes")}</Text>
          <Text style={styles.notes}>{notes}</Text>
        </View>
      ) : null}
      {details.length === 0 && !notes ? <Text style={styles.empty}>{t("chart.noAdditionalDetails")}</Text> : null}
      {onEdit ? <AppButton compact label={t("event.editTime")} tone="secondary" onPress={() => onEdit(event)} /> : null}
    </ChartDetailDialog>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  summaryCard: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 17 },
  summary: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: "800" },
  detailSection: { gap: 8 },
  detailLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  detailPills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  detailPill: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7 },
  detailPillText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  notesCard: { backgroundColor: colors.surfaceMuted, borderRadius: 14, gap: 5, padding: 12 },
  notes: { color: colors.text, fontSize: 14, lineHeight: 20 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  });
}
