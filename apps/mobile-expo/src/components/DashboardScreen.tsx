import { format } from "date-fns";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEvents } from "../hooks/useEvents";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useI18n } from "../i18n/I18nProvider";
import {
  countNightWakings,
  deduplicateBothBreasts,
  eventsWithinChartWindow,
  getAwakeState,
} from "../lib/dashboard";
import { ownerDayWindowBounds } from "../lib/events";
import { colors } from "../theme";
import type { BabyEvent, EventType } from "../types/events";
import { Banner, Card, ChoiceChips, IconButton, coreStyles } from "../ui/Core";
import { DashboardCharts } from "./DashboardChartsGroup";
import { DashboardDayHeader } from "./DashboardDayHeader";
import { EventCard } from "./EventCard";
import { EventDetailSheet } from "./EventDetailSheet";
import { EventSheet } from "./EventSheet";
import { QuickLogBar } from "./QuickLogBar";

type EventFilter = "all" | "sleep" | "feeding" | "diaper";

function elapsedParts(durationMs: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

function matchesFilter(type: EventType, filter: EventFilter): boolean {
  if (filter === "all") return true;
  if (filter === "sleep") return type === "sleep" || type === "wake_up";
  return type === filter;
}

export function DashboardScreen({ data, babyName }: {
  data: ReturnType<typeof useEvents>;
  babyName: string;
}) {
  const { dateLocale, t } = useI18n();
  const online = useNetworkStatus();
  const [sheet, setSheet] = useState<{ mode: "create" } | { mode: "edit"; event: BabyEvent } | null>(null);
  const [detailEvent, setDetailEvent] = useState<BabyEvent | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const now = new Date();
  const bounds = useMemo(() => ownerDayWindowBounds(data.selectedDay, data.dayWindowStartMinutes), [data.dayWindowStartMinutes, data.selectedDay]);
  const chartEvents = useMemo(() => eventsWithinChartWindow(data.events, data.selectedDay, data.dayWindowStartMinutes), [data.dayWindowStartMinutes, data.events, data.selectedDay]);
  const visibleEvents = useMemo(() => data.dayEvents.filter((event) => matchesFilter(event.type, filter)), [data.dayEvents, filter]);
  const awakeState = data.isToday ? getAwakeState(data.events, now) : null;
  const sleepEventCount = data.dayEvents.filter((event) => event.type === "sleep" || event.type === "wake_up").length;
  const feedingCount = deduplicateBothBreasts(data.dayEvents.filter((event) => event.type === "feeding")).length;
  const diaperCount = data.dayEvents.filter((event) => event.type === "diaper").length;
  const nightWakings = countNightWakings(data.events, data.selectedDay);
  const chartNow = data.isToday ? now : bounds.end;
  const elapsed = awakeState ? elapsedParts(awakeState.durationMs) : null;
  const duration = elapsed
    ? elapsed.hours === 0
      ? t("duration.minutes", { count: elapsed.minutes })
      : t("duration.hoursMinutes", elapsed)
    : "";

  const filterOptions: { value: EventFilter; label: string }[] = [
    { value: "all", label: t("dashboard.filterAll") },
    { value: "sleep", label: t("dashboard.filterSleep") },
    { value: "feeding", label: t("dashboard.filterFeed") },
    { value: "diaper", label: t("dashboard.filterDiaper") },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={coreStyles.screen}
        contentContainerStyle={coreStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={data.loading && data.events.length > 0} onRefresh={() => void data.refreshToday()} tintColor={colors.primary} />}
      >
        <DashboardDayHeader
          babyName={babyName}
          bounds={bounds}
          isToday={data.isToday}
          loading={data.loading}
          selectedDay={data.selectedDay}
          onNext={() => void data.selectAdjacentDay(1)}
          onPrevious={() => void data.selectAdjacentDay(-1)}
          onToday={() => void data.goToToday()}
        />

        {!online ? <Banner tone="warning">⌁ {t("dashboard.offline")}</Banner> : null}

        {awakeState ? (
          <View style={[styles.status, awakeState.isAwake ? styles.awakeStatus : styles.sleepStatus]}>
            <View style={[styles.statusDot, { backgroundColor: awakeState.isAwake ? colors.awake : colors.sleep }]} />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{awakeState.isAwake ? t("dashboard.awake") : t("dashboard.sleeping")}</Text>
              <Text style={coreStyles.muted}>{t("dashboard.since", { time: format(awakeState.since, "HH:mm", { locale: dateLocale }), duration })}</Text>
            </View>
          </View>
        ) : null}

        {data.error ? (
          <View style={styles.errorRow}>
            <View style={styles.errorCopy}><Banner>{data.error}</Banner></View>
            <IconButton label={t("common.retry")} icon="↻" onPress={() => void data.reload()} />
          </View>
        ) : null}

        <View style={styles.eventsHeading}>
          <View style={styles.sectionTitleRow}>
            <Text style={coreStyles.sectionTitle}>{t("dashboard.events")}</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{visibleEvents.length}</Text></View>
          </View>
          <ChoiceChips accessibilityLabel={t("dashboard.filterEvents")} value={filter} options={filterOptions} onChange={setFilter} />
        </View>

        {data.loading && data.events.length === 0 ? (
          <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={coreStyles.muted}>{t("dashboard.loadingDashboard")}</Text></View>
        ) : visibleEvents.length === 0 ? (
          <Card style={styles.empty}><Text style={styles.emptyEmoji}>🌙</Text><Text style={styles.emptyTitle}>{data.dayEvents.length === 0 ? t("dashboard.noEvents") : t("dashboard.noMatching")}</Text></Card>
        ) : (
          <View style={styles.eventList}>
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                allEvents={data.events}
                pending={data.mutating}
                onOpen={setDetailEvent}
                onEdit={(selected) => setSheet({ mode: "edit", event: selected })}
                onDelete={data.remove}
              />
            ))}
          </View>
        )}

        {!(data.loading && data.events.length === 0) ? (
          <DashboardCharts
            allEvents={data.events}
            chartEvents={chartEvents}
            ownerDate={data.selectedDay}
            startMinutes={data.dayWindowStartMinutes}
            babyName={babyName}
            now={chartNow}
          />
        ) : null}

        {!(data.loading && data.events.length === 0) ? (
          <View style={styles.totalsSection} accessibilityLabel={t("dashboard.dayTotals")}>
            <Text style={coreStyles.eyebrow}>{t("dashboard.dayTotals")}</Text>
            <View style={styles.stats}>
              <Stat label={t("dashboard.sleepEvents")} value={sleepEventCount} icon="😴" tone="sleep" />
              <Stat label={t("dashboard.nightWakings")} value={nightWakings} icon="🌙" tone="night" />
              <Stat label={t("dashboard.feedings")} value={feedingCount} icon="🍼" tone="feeding" />
              <Stat label={t("dashboard.diapers")} value={diaperCount} icon="👶" tone="diaper" />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <QuickLogBar
        disabled={!online || data.mutating}
        onCreate={data.create}
        onOpenDetailed={() => setSheet({ mode: "create" })}
      />

      {detailEvent ? (
        <EventDetailSheet
          visible
          event={detailEvent}
          allEvents={data.events}
          babyName={babyName}
          onClose={() => setDetailEvent(null)}
          onEdit={(event) => {
            setDetailEvent(null);
            setSheet({ mode: "edit", event });
          }}
        />
      ) : null}

      {sheet ? (
        <EventSheet
          event={sheet.mode === "edit" ? sheet.event : null}
          pending={data.mutating}
          error={data.error}
          onClose={() => setSheet(null)}
          onCreate={data.create}
          onUpdateTime={data.updateTime}
        />
      ) : null}
    </View>
  );
}

function Stat({ label, value, icon, tone }: {
  label: string;
  value: number;
  icon: string;
  tone: "sleep" | "night" | "feeding" | "diaper";
}) {
  const background = tone === "sleep" ? colors.sleepSoft : tone === "night" ? colors.nightSoft : tone === "feeding" ? colors.feedingSoft : colors.diaperSoft;
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={[styles.stat, { backgroundColor: background }]}>
      <View style={styles.statMetric}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text numberOfLines={2} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  status: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 17, borderWidth: 1 },
  awakeStatus: { backgroundColor: colors.awakeSoft, borderColor: "#f5d0a7" },
  sleepStatus: { backgroundColor: colors.sleepSoft, borderColor: "#d8c5ec" },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  statusCopy: { gap: 2 },
  statusTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorCopy: { flex: 1 },
  totalsSection: { gap: 7, paddingTop: 2 },
  stats: { flexDirection: "row", gap: 6 },
  stat: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 1, borderRadius: 12, paddingHorizontal: 3, paddingVertical: 6 },
  statMetric: { flexDirection: "row", alignItems: "center", gap: 3 },
  statIcon: { fontSize: 13 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 8, lineHeight: 10, fontWeight: "700", textAlign: "center" },
  eventsHeading: { gap: 10, paddingTop: 3 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { minHeight: 130, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  eventList: { gap: 7 },
});
