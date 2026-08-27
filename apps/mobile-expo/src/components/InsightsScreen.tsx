import { format } from "date-fns";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { useSleepInsights } from "../hooks/useSleepInsights";
import { formatAge, formatEventDuration } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import {
  compareTotalSleepWithGuidance,
  ownerDateKey,
  type DailySleepSummary,
  type TotalSleepGuidanceComparison,
} from "../lib/sleepInsights";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import type { BabyProfile } from "../types/profile";
import { AppButton, Banner, Card, IconButton, useCoreStyles } from "../ui/Core";

function duration(minutes: number | null, locale: "en" | "es", empty: string): string {
  return minutes === null ? empty : formatEventDuration(minutes * 60_000, locale);
}

function guidanceCopy(
  summary: DailySleepSummary,
  name: string,
  locale: "en" | "es",
  t: ReturnType<typeof useI18n>["t"]
): { message: string; shortLabel: string; status: TotalSleepGuidanceComparison["status"] } {
  const comparison = compareTotalSleepWithGuidance(summary);
  const values: Record<string, string | number> = { name };
  if (comparison.reference) {
    values.total = duration(summary.totalSleepMinutes, locale, "—");
    values.min = duration(comparison.reference.minMinutes, locale, "—");
    values.max = duration(comparison.reference.maxMinutes, locale, "—");
  }
  return {
    message: t(`insights.guidance.${comparison.status}`, values),
    shortLabel: t(`insights.guidance.${comparison.status}Short`),
    status: comparison.status,
  };
}

export function InsightsScreen({
  data,
  profile,
  selectedOwnerDate,
  onSelectOwnerDate,
  bottomContentInset = 0,
}: {
  data: ReturnType<typeof useSleepInsights>;
  profile: BabyProfile;
  selectedOwnerDate: Date | null;
  onSelectOwnerDate: (date: Date | null) => void;
  bottomContentInset?: number;
}) {
  const { dateLocale, locale, t } = useI18n();
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedKey = selectedOwnerDate ? ownerDateKey(selectedOwnerDate) : null;
  const selectedIndex = selectedKey
    ? data.summaries.findIndex((summary) => ownerDateKey(summary.ownerDate) === selectedKey)
    : -1;
  const selected = selectedIndex >= 0 ? data.summaries[selectedIndex] : null;

  if (selected) {
    const guidance = guidanceCopy(selected, profile.name, locale, t);
    return (
      <ScrollView
        style={coreStyles.screen}
        contentContainerStyle={[coreStyles.scrollContent, { paddingBottom: bottomContentInset }]}
      >
        <View style={styles.detailHeading}>
          <View style={styles.detailHeadingCopy}>
            <Text style={coreStyles.eyebrow}>{t("insights.detail")}</Text>
            <Text style={styles.detailTitle}>{format(selected.ownerDate, "EEEE, d MMMM yyyy", { locale: dateLocale })}</Text>
          </View>
          <AppButton compact label={t("insights.backToHistory")} tone="text" onPress={() => onSelectOwnerDate(null)} />
        </View>

        <Card style={styles.navigator}>
          <IconButton
            compact
            label={t("insights.previousDay")}
            icon="‹"
            disabled={selectedIndex >= data.summaries.length - 1}
            onPress={() => onSelectOwnerDate(data.summaries[selectedIndex + 1]?.ownerDate ?? selected.ownerDate)}
          />
          <View style={styles.navigatorCopy}>
            <Text style={styles.navigatorRange}>
              {format(selected.windowStart, "d MMM, HH:mm", { locale: dateLocale })} – {format(selected.windowEnd, "d MMM, HH:mm", { locale: dateLocale })}
            </Text>
            {selectedIndex !== 0 ? (
              <AppButton compact label={t("insights.returnToday")} tone="text" onPress={() => onSelectOwnerDate(data.summaries[0]?.ownerDate ?? selected.ownerDate)} />
            ) : null}
          </View>
          <IconButton
            compact
            label={t("insights.nextDay")}
            icon="›"
            disabled={selectedIndex <= 0}
            onPress={() => onSelectOwnerDate(data.summaries[selectedIndex - 1]?.ownerDate ?? selected.ownerDate)}
          />
        </Card>

        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t("insights.totalSleep")}</Text>
          <Text style={styles.heroValue}>{duration(selected.totalSleepMinutes || null, locale, t("insights.noDuration"))}</Text>
          <Text style={coreStyles.muted}>{t("insights.ageAtEnd", { age: formatAge(profile.dateOfBirth, locale, selected.windowEnd) })}</Text>
        </Card>

        <Card style={styles.cardGap}>
          <Text style={coreStyles.sectionTitle}>{t("insights.guidance.title")}</Text>
          <Banner tone={guidance.status === "within" ? "success" : guidance.status === "below" || guidance.status === "above" ? "warning" : "neutral"}>
            {guidance.message}
          </Banner>
          <Text style={coreStyles.body}>{t("insights.guidance.meaning")}</Text>
          <Text style={coreStyles.muted}>{t("insights.guidance.otherMetrics")}</Text>
          <Text style={coreStyles.muted}>{t("insights.guidance.recordedOnly")}</Text>
          <Text style={coreStyles.muted}>{t("insights.guidance.sourcesBelow")}</Text>
        </Card>

        <View style={styles.metricGrid}>
          <MetricCard
            label={t("insights.daytimeSleep")}
            value={duration(selected.daytimeSleepMinutes || null, locale, t("insights.noDuration"))}
            detail={t("insights.sessionSummary", {
              count: selected.daytimeSessionCount,
              average: duration(selected.daytimeAverageMinutes, locale, t("insights.noAverage")),
            })}
          />
          <MetricCard
            label={t("insights.nighttimeSleep")}
            value={duration(selected.nighttimeSleepMinutes || null, locale, t("insights.noDuration"))}
            detail={t("insights.sessionSummary", {
              count: selected.nighttimeSessionCount,
              average: duration(selected.nighttimeAverageMinutes, locale, t("insights.noAverage")),
            })}
          />
          <MetricCard
            label={t("insights.nightWakings")}
            value={String(selected.nightWakings)}
            detail={t("insights.nightWakingDefinition")}
          />
          <MetricCard
            label={t("insights.longestStretch")}
            value={duration(selected.longestSleepMinutes, locale, t("insights.noDuration"))}
            detail={t("insights.completedSessions")}
          />
        </View>

        <Card style={styles.cardGap}>
          <Text style={coreStyles.sectionTitle}>{t("insights.ownerWindow")}</Text>
          <Text style={coreStyles.body}>
            {format(selected.windowStart, "PPp", { locale: dateLocale })} – {format(selected.windowEnd, "PPp", { locale: dateLocale })}
          </Text>
          <Text style={styles.fieldLabel}>{t("insights.dayNightDefinition")}</Text>
          <Text style={coreStyles.body}>{t("insights.dayNightDefinitionValue")}</Text>
        </Card>

        <Card style={styles.cardGap}>
          <Text style={coreStyles.sectionTitle}>{t("insights.dataQuality")}</Text>
          <Text style={coreStyles.body}>{t("insights.dataQualityValue", {
            pairs: selected.completePairCount,
            excluded: selected.excludedUnmatchedCount,
          })}</Text>
          {selected.excludedUnmatchedCount > 0 ? <Banner tone="warning">{t("insights.incompleteData")}</Banner> : null}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={coreStyles.sectionTitle}>{t("insights.references")}</Text>
          {selected.references.length === 0 ? <Text style={coreStyles.body}>{t("insights.noReference")}</Text> : null}
          {selected.references.map((reference) => (
            <View key={reference.source} style={styles.referenceCard}>
              <Text style={styles.referenceSource}>{t("insights.referenceSource", {
                source: reference.sourceName,
                year: reference.publicationYear,
              })}</Text>
              <Text style={coreStyles.body}>{t("insights.referenceRange", {
                min: formatEventDuration(reference.minMinutes * 60_000, locale),
                max: formatEventDuration(reference.maxMinutes * 60_000, locale),
              })}</Text>
              <Text style={coreStyles.muted}>{t("insights.referencePopulation", {
                min: reference.minAgeMonths,
                max: reference.maxAgeMonthsExclusive - 1,
              })}</Text>
              <Text style={coreStyles.muted}>{t("insights.referenceVersion", { version: reference.version })}</Text>
              <AppButton compact label={t("insights.sourceDetails")} tone="text" onPress={() => void Linking.openURL(reference.sourceUrl)} />
            </View>
          ))}
          <Banner tone="neutral">{t("insights.disclaimer")}</Banner>
          <Text style={coreStyles.muted}>{t("insights.clinician")}</Text>
        </Card>
      </ScrollView>
    );
  }

  const hasRecordedData = data.summaries.some(
    (summary) => summary.completePairCount > 0 || summary.excludedUnmatchedCount > 0
  );
  return (
    <ScrollView
      style={coreStyles.screen}
      contentContainerStyle={[coreStyles.scrollContent, { paddingBottom: bottomContentInset }]}
    >
      <View style={styles.heading}>
        <Text style={coreStyles.eyebrow}>{t("insights.subtitle")}</Text>
        <Text style={coreStyles.title}>{t("insights.title")}</Text>
      </View>
      {data.error ? (
        <Banner>
          {t("insights.loadError")} {" "}
          <Text accessibilityRole="button" onPress={() => void data.reload()}>{t("common.retry")}</Text>
        </Banner>
      ) : null}
      {data.loading ? <Banner tone="neutral">{t("insights.loading")}</Banner> : null}
      {!data.loading && !hasRecordedData ? <Banner tone="neutral">{t("insights.emptyHistory")}</Banner> : null}
      {data.summaries.map((summary, index) => {
        const date = format(summary.ownerDate, "EEEE, d MMMM", { locale: dateLocale });
        const guidance = guidanceCopy(summary, profile.name, locale, t);
        return (
          <Pressable
            key={ownerDateKey(summary.ownerDate)}
            accessibilityRole="button"
            accessibilityLabel={t("insights.openDay", { date })}
            onPress={() => onSelectOwnerDate(summary.ownerDate)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card style={styles.dayCard}>
              <View style={styles.dayCopy}>
                <Text style={styles.dayTitle}>{index === 0 ? t("insights.today") : date}</Text>
                <Text style={coreStyles.muted}>{t("insights.dataQualityValue", {
                  pairs: summary.completePairCount,
                  excluded: summary.excludedUnmatchedCount,
                })}</Text>
                <Text style={[
                  styles.dayGuidance,
                  guidance.status === "within" && styles.dayGuidanceWithin,
                  (guidance.status === "below" || guidance.status === "above") && styles.dayGuidanceOutside,
                ]}>
                  {guidance.shortLabel}
                </Text>
              </View>
              <View style={styles.dayMetric}>
                <Text style={styles.dayValue}>{duration(summary.totalSleepMinutes || null, locale, "—")}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  const { colors } = useTheme();
  const coreStyles = useCoreStyles();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={coreStyles.muted}>{detail}</Text>
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  heading: { gap: 4 },
  detailHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailHeadingCopy: { flex: 1, gap: 3 },
  detailTitle: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  navigator: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  navigatorCopy: { flex: 1, alignItems: "center", gap: 3 },
  navigatorRange: { color: colors.primaryDark, fontSize: 12, lineHeight: 17, fontWeight: "800", textAlign: "center" },
  heroCard: { alignItems: "center", gap: 5, backgroundColor: colors.primarySoft },
  heroLabel: { color: colors.primaryDark, fontSize: 13, fontWeight: "800" },
  heroValue: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: "900" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48%", flexGrow: 1, gap: 4, minHeight: 126 },
  metricLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: "900" },
  cardGap: { gap: 12 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 3 },
  referenceCard: { gap: 7, padding: 13, borderRadius: 15, backgroundColor: colors.surfaceMuted },
  referenceSource: { color: colors.primaryDark, fontSize: 14, fontWeight: "900" },
  dayCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  dayCopy: { flex: 1, gap: 4 },
  dayTitle: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: "900" },
  dayGuidance: { color: colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "800" },
  dayGuidanceWithin: { color: colors.success },
  dayGuidanceOutside: { color: colors.warning },
  dayMetric: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayValue: { color: colors.primaryDark, fontSize: 16, fontWeight: "900" },
  chevron: { color: colors.textMuted, fontSize: 25, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  });
}
