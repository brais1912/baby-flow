import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { formatSleepChartDuration } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import {
  aggregateDiaperByDay,
  aggregateFeedingByDay,
  aggregateSleepByDay,
  buildTimeline,
} from "../lib/dashboard";
import { ownerDayWindowBounds } from "../lib/events";
import { colors } from "../theme";
import type { BabyEvent } from "../types/events";
import { ChartDetailDialog } from "../ui/ChartDetailDialog";
import { Card, IconButton, coreStyles } from "../ui/Core";

const eventLabelKeys: Record<BabyEvent["type"], MessageKey> = {
  sleep: "event.sleep",
  wake_up: "event.wake",
  feeding: "event.feed",
  diaper: "event.diaper",
};
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

function durationLabel(start: Date, end: Date, t: ReturnType<typeof useI18n>["t"]): string {
  const totalMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
  if (totalMinutes < 60) return t("duration.minutes", { count: totalMinutes });
  return t("duration.hoursMinutes", { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 });
}

function ChartPanel({ title, icon, ownerDate, children }: {
  title: string;
  icon: string;
  ownerDate: Date;
  children: React.ReactNode;
}) {
  const { dateLocale, t } = useI18n();
  const first = new Date(ownerDate);
  first.setDate(first.getDate() - 9);
  return (
    <Card style={styles.panel}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeadingCopy}>
          <Text style={styles.chartTitle}>{icon} {title}</Text>
          <Text style={coreStyles.muted}>{t("chart.range", {
            start: format(first, "d MMM", { locale: dateLocale }),
            end: format(ownerDate, "d MMM", { locale: dateLocale }),
          })}</Text>
        </View>
      </View>
      {children}
    </Card>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <View style={styles.empty}><Text style={coreStyles.muted}>{children}</Text></View>;
}

function TimelineEventDetail({ event, wakeUp, onClose }: { event: BabyEvent; wakeUp: BabyEvent | null; onClose: () => void }) {
  const { dateLocale, t } = useI18n();
  const details: string[] = [];
  const detailValue = event.type === "feeding"
    ? event.feedingType
    : event.type === "diaper"
      ? event.diaperType
      : event.type === "sleep"
        ? event.sleepMethod
        : null;
  if (detailValue) details.push(t(detailLabelKeys[detailValue] ?? "common.other"));
  if (event.feedingAmountMl) details.push(`${event.feedingAmountMl} ml`);
  if (event.feedingDurationMinutes) details.push(t("duration.minutes", { count: event.feedingDurationMinutes }));
  if (event.sleepCondition) details.push(t(detailLabelKeys[event.sleepCondition] ?? "common.other"));
  if (event.sleepRoomTemperature !== null) details.push(`${event.sleepRoomTemperature}°C`);
  if (event.type === "sleep" && wakeUp) details.push(durationLabel(event.occurredAt, wakeUp.occurredAt, t));
  if (event.notes && event.notes !== "QuickLog") details.push(event.notes);
  const start = format(event.occurredAt, "HH:mm", { locale: dateLocale });
  const time = wakeUp ? `${start} → ${format(wakeUp.occurredAt, "HH:mm", { locale: dateLocale })}` : start;
  return (
    <ChartDetailDialog visible title={`${t(eventLabelKeys[event.type])} · ${time}`} onClose={onClose}>
      <Text style={styles.detailText}>{details.join(" · ") || t("common.notSpecified")}</Text>
    </ChartDetailDialog>
  );
}

export function TimelineChart({ events, ownerDate, startMinutes, now = new Date() }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now?: Date;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { dateLocale, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<{ event: BabyEvent; wakeUp: BabyEvent | null } | null>(null);
  const timeline = useMemo(() => buildTimeline(events, ownerDate, startMinutes, now), [events, now, ownerDate, startMinutes]);
  const bounds = ownerDayWindowBounds(ownerDate, startMinutes);
  const viewWidth = expanded ? 1200 : Math.max(320, screenWidth - 66);
  const plotStart = 52;
  const plotWidth = viewWidth - plotStart - 16;
  const x = (date: Date) => plotStart + ((date.getTime() - bounds.start.getTime()) / (bounds.end.getTime() - bounds.start.getTime())) * plotWidth;
  const ticks = Array.from({ length: expanded ? 25 : 9 }, (_, index) => expanded ? index : index * 3);
  const empty = timeline.sleeps.length === 0 && timeline.points.length === 0;
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  function selectEvent(eventId: string, wakeId: string | null = null) {
    const event = eventsById.get(eventId);
    if (!event) return;
    setSelected({ event, wakeUp: wakeId ? eventsById.get(wakeId) ?? null : null });
  }

  return (
    <Card style={styles.panel}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeadingCopy}>
          <Text style={styles.chartTitle}>◷ {t("chart.timeline")}</Text>
          <Text style={coreStyles.muted}>{format(bounds.start, "HH:mm", { locale: dateLocale })} - {format(bounds.end, "HH:mm", { locale: dateLocale })}</Text>
        </View>
        <IconButton compact label={expanded ? t("chart.collapseTimeline") : t("chart.expandTimeline")} icon={expanded ? "↙" : "↗"} onPress={() => setExpanded((current) => !current)} />
      </View>
      <ScrollView horizontal={expanded} showsHorizontalScrollIndicator={expanded} contentContainerStyle={styles.timelineScroll}>
        <Svg width={viewWidth} height={148} accessibilityLabel={t("chart.timelineAria")}>
          {[
            { label: t("chart.sleepLane"), y: 22 },
            { label: t("chart.feedingLane"), y: 60 },
            { label: t("chart.diaperLane"), y: 98 },
          ].map((lane, index) => (
            <G key={lane.label}>
              <Rect x={0} y={lane.y - 15} width={viewWidth} height={30} fill={index % 2 === 0 ? "#faf9fc" : "#ffffff"} />
              <SvgText x={47} y={lane.y + 4} textAnchor="end" fill={colors.textMuted} fontSize={10} fontWeight="700">{lane.label}</SvgText>
            </G>
          ))}
          {ticks.map((hour) => {
            const tickX = plotStart + (hour / 24) * plotWidth;
            const labelHour = (Math.floor(startMinutes / 60) + hour) % 24;
            return (
              <G key={hour}>
                <Line x1={tickX} y1={7} x2={tickX} y2={113} stroke={colors.border} strokeWidth={1} />
                <SvgText x={tickX} y={135} textAnchor="middle" fill={colors.textMuted} fontSize={9}>{String(labelHour).padStart(2, "0")}:00</SvgText>
              </G>
            );
          })}
          {timeline.sleeps.map((sleep) => {
            const event = eventsById.get(sleep.id);
            if (!event) return null;
            const startX = x(sleep.start);
            const width = Math.max(5, x(sleep.end) - startX);
            return (
              <G key={sleep.id} onPress={() => selectEvent(sleep.id, sleep.wakeId)} accessibilityLabel={t("chart.eventAria", { event: t("event.sleep"), time: format(event.occurredAt, "HH:mm") })} accessible>
                <Rect x={startX} y={6} width={width} height={31} rx={7} fill="transparent" />
                <Rect x={startX} y={15} width={width} height={14} rx={7} fill={colors.sleep} />
              </G>
            );
          })}
          {timeline.points.map((point) => {
            const event = eventsById.get(point.id);
            if (!event) return null;
            const pointX = x(point.occurredAt);
            const pointY = point.type === "feeding" ? 60 : 98;
            const fill = point.type === "feeding" ? colors.feeding : colors.diaper;
            return (
              <G key={point.id} onPress={() => selectEvent(point.id)} accessibilityLabel={t("chart.eventAria", { event: t(eventLabelKeys[event.type]), time: format(event.occurredAt, "HH:mm") })} accessible>
                <Circle cx={pointX} cy={pointY} r={18} fill="transparent" />
                <Circle cx={pointX} cy={pointY} r={9} fill={fill} />
                <SvgText x={pointX} y={pointY + 3} textAnchor="middle" fill="#ffffff" fontSize={8} fontWeight="800">{point.type === "feeding" ? t("chart.feedingShort") : t("chart.diaperShort")}</SvgText>
              </G>
            );
          })}
          {empty ? <SvgText x={plotStart + plotWidth / 2} y={63} textAnchor="middle" fill={colors.textMuted} fontSize={11}>{t("dashboard.noEvents")}</SvgText> : null}
        </Svg>
      </ScrollView>
      {selected ? <TimelineEventDetail event={selected.event} wakeUp={selected.wakeUp} onClose={() => setSelected(null)} /> : null}
    </Card>
  );
}

const CHART_HEIGHT = 210;
const PLOT_TOP = 22;
const PLOT_BOTTOM = 36;
const PLOT_LEFT = 30;
const PLOT_RIGHT = 8;

function barGeometry(width: number, count: number, max: number) {
  const plotWidth = width - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const slot = plotWidth / count;
  return {
    plotWidth,
    plotHeight,
    slot,
    barWidth: Math.max(8, slot * 0.56),
    x: (index: number) => PLOT_LEFT + slot * index + slot / 2,
    y: (value: number) => PLOT_TOP + plotHeight - (value / Math.max(1, max)) * plotHeight,
  };
}

function Grid({ width, max }: { width: number; max: number }) {
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  return (
    <>
      {[0, 0.5, 1].map((ratio) => {
        const y = PLOT_TOP + plotHeight * ratio;
        return (
          <G key={ratio}>
            <Line x1={PLOT_LEFT} y1={y} x2={width - PLOT_RIGHT} y2={y} stroke={colors.border} />
            <SvgText x={PLOT_LEFT - 5} y={y + 3} textAnchor="end" fontSize={8} fill={colors.textMuted}>{Math.round(max * (1 - ratio) * 10) / 10}</SvgText>
          </G>
        );
      })}
    </>
  );
}

export function SleepChart({ events, ownerDate, startMinutes, now }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now: Date;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { dateLocale, locale, t } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const data = useMemo(() => aggregateSleepByDay(events, ownerDate, startMinutes, now).map((day) => ({
    label: format(day.date, "d MMM", { locale: dateLocale }),
    hours: day.hours,
  })), [dateLocale, events, now, ownerDate, startMinutes]);
  const hasData = data.some(({ hours }) => hours > 0);
  const width = Math.max(300, screenWidth - 66);
  const max = Math.max(1, ...data.map(({ hours }) => hours));
  const geometry = barGeometry(width, data.length, max);

  return (
    <ChartPanel title={t("chart.sleepDuration")} icon="😴" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>{t("chart.noSleep")}</EmptyChart> : (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Grid width={width} max={max} />
            {data.map((day, index) => {
              const center = geometry.x(index);
              const y = geometry.y(day.hours);
              return (
                <G key={day.label} onPress={() => setSelected(index)} accessible accessibilityLabel={`${day.label}: ${formatSleepChartDuration(day.hours, locale)}`}>
                  <Rect x={center - geometry.slot / 2} y={PLOT_TOP} width={geometry.slot} height={geometry.plotHeight} fill="transparent" />
                  <Rect x={center - geometry.barWidth / 2} y={y} width={geometry.barWidth} height={Math.max(0, PLOT_TOP + geometry.plotHeight - y)} rx={4} fill={colors.sleep} />
                  {day.hours > 0 ? <SvgText x={center} y={Math.max(10, y - 5)} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.primaryDark}>{formatSleepChartDuration(day.hours, locale)}</SvgText> : null}
                  {index % 2 === 0 ? <SvgText x={center} y={CHART_HEIGHT - 12} textAnchor="middle" fontSize={8} fill={colors.textMuted}>{day.label}</SvgText> : null}
                </G>
              );
            })}
          </Svg>
          {selected !== null && data[selected] ? (
            <ChartDetailDialog visible title={data[selected].label} onClose={() => setSelected(null)}>
              <Text style={styles.detailText}>{formatSleepChartDuration(data[selected].hours, locale) || t("chart.noSleep")}</Text>
            </ChartDetailDialog>
          ) : null}
        </>
      )}
    </ChartPanel>
  );
}

export function FeedingChart({ events, ownerDate, startMinutes }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { dateLocale, t } = useI18n();
  const [mode, setMode] = useState<"breast" | "bottle">("breast");
  const [selected, setSelected] = useState<number | null>(null);
  const data = useMemo(() => aggregateFeedingByDay(events, ownerDate, startMinutes).map((day) => ({
    label: format(day.date, "d MMM", { locale: dateLocale }),
    breast: day.breastSessions,
    bottleSessions: day.bottleSessions,
    bottle: day.bottleMl,
  })), [dateLocale, events, ownerDate, startMinutes]);
  const hasData = data.some(({ breast, bottleSessions }) => breast > 0 || bottleSessions > 0);
  const width = Math.max(300, screenWidth - 66);
  const values = data.map((day) => mode === "breast" ? day.breast : day.bottle);
  const max = Math.max(1, ...values);
  const geometry = barGeometry(width, data.length, max);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"} ${geometry.x(index)} ${geometry.y(value)}`).join(" ");

  return (
    <ChartPanel title={t("chart.feeding")} icon="🍼" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>{t("chart.noFeeding")}</EmptyChart> : (
        <>
          <View style={styles.segmented} accessibilityRole="tablist">
            <Segment active={mode === "breast"} label={t("chart.breastSessions")} onPress={() => { setMode("breast"); setSelected(null); }} />
            <Segment active={mode === "bottle"} label={t("chart.bottleMl")} onPress={() => { setMode("bottle"); setSelected(null); }} />
          </View>
          <Svg width={width} height={CHART_HEIGHT}>
            <Grid width={width} max={max} />
            {mode === "bottle" ? <Path d={path} fill="none" stroke={colors.feeding} strokeWidth={2.5} /> : null}
            {data.map((day, index) => {
              const center = geometry.x(index);
              const value = values[index] ?? 0;
              const y = geometry.y(value);
              return (
                <G key={day.label} onPress={() => setSelected(index)} accessible accessibilityLabel={`${day.label}: ${value}`}>
                  <Rect x={center - geometry.slot / 2} y={PLOT_TOP} width={geometry.slot} height={geometry.plotHeight} fill="transparent" />
                  {mode === "breast" ? <Rect x={center - geometry.barWidth / 2} y={y} width={geometry.barWidth} height={Math.max(0, PLOT_TOP + geometry.plotHeight - y)} rx={4} fill={colors.feeding} /> : <Circle cx={center} cy={y} r={4} fill={colors.feeding} />}
                  {index % 2 === 0 ? <SvgText x={center} y={CHART_HEIGHT - 12} textAnchor="middle" fontSize={8} fill={colors.textMuted}>{day.label}</SvgText> : null}
                </G>
              );
            })}
          </Svg>
          {selected !== null && data[selected] ? (
            <ChartDetailDialog visible title={data[selected].label} onClose={() => setSelected(null)}>
              <Text style={styles.detailText}>{mode === "breast" ? `${data[selected].breast} ${t("chart.sessions")}` : `${data[selected].bottle} ml`}</Text>
            </ChartDetailDialog>
          ) : null}
        </>
      )}
    </ChartPanel>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function DiaperChart({ events, ownerDate, startMinutes }: {
  events: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { dateLocale, t } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const data = useMemo(() => aggregateDiaperByDay(events, ownerDate, startMinutes).map((day) => ({
    label: format(day.date, "d MMM", { locale: dateLocale }),
    pee: day.pee,
    poop: day.poop,
    both: day.both,
  })), [dateLocale, events, ownerDate, startMinutes]);
  const totals = data.map((day) => day.pee + day.poop + day.both);
  const hasData = totals.some((total) => total > 0);
  const width = Math.max(300, screenWidth - 66);
  const max = Math.max(1, ...totals);
  const geometry = barGeometry(width, data.length, max);

  return (
    <ChartPanel title={t("chart.diaperChanges")} icon="👶" ownerDate={ownerDate}>
      {!hasData ? <EmptyChart>{t("chart.noDiaper")}</EmptyChart> : (
        <>
          <View style={styles.legend}>
            <LegendDot color="#e8b923" label={t("event.pee")} />
            <LegendDot color="#98623a" label={t("event.poop")} />
            <LegendDot color="#e47a36" label={t("event.both")} />
          </View>
          <Svg width={width} height={CHART_HEIGHT}>
            <Grid width={width} max={max} />
            {data.map((day, index) => {
              const center = geometry.x(index);
              let cumulative = 0;
              const segments = [
                { key: "pee", value: day.pee, fill: "#e8b923" },
                { key: "poop", value: day.poop, fill: "#98623a" },
                { key: "both", value: day.both, fill: "#e47a36" },
              ];
              return (
                <G key={day.label} onPress={() => setSelected(index)} accessible accessibilityLabel={`${day.label}: ${totals[index] ?? 0}`}>
                  <Rect x={center - geometry.slot / 2} y={PLOT_TOP} width={geometry.slot} height={geometry.plotHeight} fill="transparent" />
                  {segments.map((segment) => {
                    const yBottom = geometry.y(cumulative);
                    cumulative += segment.value;
                    const yTop = geometry.y(cumulative);
                    return <Rect key={segment.key} x={center - geometry.barWidth / 2} y={yTop} width={geometry.barWidth} height={Math.max(0, yBottom - yTop)} fill={segment.fill} />;
                  })}
                  {index % 2 === 0 ? <SvgText x={center} y={CHART_HEIGHT - 12} textAnchor="middle" fontSize={8} fill={colors.textMuted}>{day.label}</SvgText> : null}
                </G>
              );
            })}
          </Svg>
          {selected !== null && data[selected] ? (
            <ChartDetailDialog visible title={data[selected].label} onClose={() => setSelected(null)}>
              <Text style={styles.detailText}>{t("event.pee")}: {data[selected].pee} · {t("event.poop")}: {data[selected].poop} · {t("event.both")}: {data[selected].both}</Text>
            </ChartDetailDialog>
          ) : null}
        </>
      )}
    </ChartPanel>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={coreStyles.muted}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  panel: { gap: 12, overflow: "hidden" },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartHeadingCopy: { gap: 3 },
  chartTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  empty: { minHeight: 120, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 18 },
  timelineScroll: { minWidth: "100%" },
  detailText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  segmented: { flexDirection: "row", backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 3 },
  segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  segmentTextActive: { color: colors.feeding },
  legend: { flexDirection: "row", justifyContent: "center", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
