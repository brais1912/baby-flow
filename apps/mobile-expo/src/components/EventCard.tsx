import { format } from "date-fns";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { formatEventDuration } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import { eventPhaseDuration } from "../lib/eventDurations";
import { colors } from "../theme";
import type { BabyEvent } from "../types/events";
import { IconButton } from "../ui/Core";

const emoji = { sleep: "😴", wake_up: "🌅", feeding: "🍼", diaper: "👶" } as const;
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
  other: "common.other",
};

function eventDetail(event: BabyEvent, t: (key: MessageKey) => string): string | null {
  if (event.type === "feeding") {
    return [event.feedingType ? t(detailLabelKeys[event.feedingType] ?? "common.other") : null, event.feedingAmountMl ? `${event.feedingAmountMl} ml` : null]
      .filter(Boolean).join(" · ") || null;
  }
  if (event.type === "diaper") return event.diaperType ? t(detailLabelKeys[event.diaperType] ?? "common.other") : null;
  if (event.type === "sleep") return event.sleepMethod ? t(detailLabelKeys[event.sleepMethod] ?? "common.other") : null;
  return null;
}

export function EventCard({
  event,
  allEvents,
  pending,
  confirming,
  swipeOpen,
  onOpen,
  onEdit,
  onDelete,
  onDeleteRequest,
  onDeleteCancel,
  onSwipeOpen,
  onSwipeClose,
}: {
  event: BabyEvent;
  allEvents: BabyEvent[];
  pending: boolean;
  confirming: boolean;
  swipeOpen: boolean;
  onOpen: (event: BabyEvent) => void;
  onEdit: (event: BabyEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
  onDeleteRequest: (eventId: string) => void;
  onDeleteCancel: (eventId: string) => void;
  onSwipeOpen: (eventId: string) => void;
  onSwipeClose: (eventId: string) => void;
}) {
  const { dateLocale, locale, t } = useI18n();
  const swipeable = useRef<SwipeableMethods>(null);
  const detail = eventDetail(event, t);
  const phaseDuration = eventPhaseDuration(event, allEvents);
  const phaseDurationLabel = phaseDuration ? formatEventDuration(phaseDuration.durationMs, locale) : null;
  const tone = event.type === "sleep" ? colors.sleep : event.type === "wake_up" ? colors.awake : event.type === "feeding" ? colors.feeding : colors.diaper;
  const time = format(event.occurredAt, "HH:mm", { locale: dateLocale });

  useEffect(() => {
    if (!swipeOpen || pending || confirming) swipeable.current?.close();
  }, [confirming, pending, swipeOpen]);

  function startConfirmation(methods?: SwipeableMethods) {
    methods?.close();
    onDeleteRequest(event.id);
  }

  function startEditing(methods?: SwipeableMethods) {
    methods?.close();
    onEdit(event);
  }

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      testID={`event-swipe-${event.id}`}
      enabled={!pending && !confirming}
      friction={1.7}
      leftThreshold={42}
      rightThreshold={42}
      dragOffsetFromLeftEdge={12}
      dragOffsetFromRightEdge={12}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      onSwipeableWillOpen={() => onSwipeOpen(event.id)}
      onSwipeableOpen={(direction) => {
        if (direction === "right") {
          startEditing(swipeable.current ?? undefined);
          return;
        }
        startConfirmation(swipeable.current ?? undefined);
      }}
      onSwipeableClose={() => onSwipeClose(event.id)}
      renderLeftActions={() => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.swipeAction, styles.swipeEdit, pending && styles.disabled]}
        >
          <Text style={styles.swipeActionIcon}>✎</Text>
          <Text style={styles.swipeActionLabel}>{t("event.editTime")}</Text>
        </View>
      )}
      renderRightActions={() => (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.swipeAction, styles.swipeDelete, pending && styles.disabled]}
        >
          <Text style={styles.swipeActionIcon}>⌫</Text>
          <Text style={styles.swipeActionLabel}>{t("common.delete")}</Text>
        </View>
      )}
    >
      {confirming ? (
        <View style={[styles.card, { borderLeftColor: tone }]}>
          <Text style={styles.confirmText}>{t("event.deleteConfirm")}</Text>
          <View style={styles.actions}>
            <IconButton compact label={t("common.cancel")} icon="×" disabled={pending} onPress={() => onDeleteCancel(event.id)} />
            <IconButton compact label={t("common.delete")} icon="⌫" danger disabled={pending} onPress={() => void onDelete(event.id)} />
          </View>
        </View>
      ) : (
        <View style={[styles.card, { borderLeftColor: tone }]}>
          <Pressable
            accessibilityLabel={t("event.openDetails", { event: t(eventLabelKeys[event.type]), time })}
            accessibilityRole="button"
            onPress={() => {
              if (swipeOpen) {
                swipeable.current?.close();
                return;
              }
              onOpen(event);
            }}
            style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}
          >
            <View style={styles.iconWrap}><Text style={styles.emoji}>{emoji[event.type]}</Text></View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{t(eventLabelKeys[event.type])}</Text>
                {phaseDuration && phaseDurationLabel ? (
                  <View style={[styles.badge, phaseDuration.kind === "awake" ? styles.awakeBadge : styles.sleepBadge]}>
                    <Text style={styles.badgeText}>{phaseDuration.kind === "awake" ? "🌅 " : "😴 "}{phaseDurationLabel}</Text>
                  </View>
                ) : null}
                {event.notes === "QuickLog" ? <View style={styles.quickBadge}><Text style={styles.quickText}>⚡ {t("event.quickLog")}</Text></View> : null}
              </View>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
              {event.notes && event.notes !== "QuickLog" ? <Text style={styles.notes}>{event.notes}</Text> : null}
            </View>
            <Text style={styles.time}>{time}</Text>
          </Pressable>
          <View style={styles.meta}>
            <View style={styles.actions}>
              <IconButton compact label={t("event.editTime")} icon="✎" disabled={pending} onPress={() => onEdit(event)} />
              <IconButton compact label={t("common.delete")} icon="⌫" danger disabled={pending} onPress={() => startConfirmation()} />
            </View>
          </View>
        </View>
      )}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { borderRadius: 14, overflow: "hidden" },
  swipeAction: { width: 82, alignItems: "center", justifyContent: "center", gap: 3 },
  swipeEdit: { backgroundColor: colors.primary },
  swipeDelete: { backgroundColor: colors.danger },
  swipeActionIcon: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  swipeActionLabel: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  card: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, padding: 9, minHeight: 62 },
  openArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minHeight: 42 },
  pressed: { opacity: 0.62 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 16 },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: "800" },
  detail: { color: colors.textMuted, fontSize: 11 },
  notes: { color: colors.text, fontSize: 11, fontStyle: "italic" },
  meta: { alignItems: "flex-end" },
  time: { color: colors.text, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7 },
  awakeBadge: { backgroundColor: colors.awakeSoft },
  sleepBadge: { backgroundColor: colors.sleepSoft },
  badgeText: { color: colors.text, fontSize: 9, fontWeight: "700" },
  quickBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 7 },
  quickText: { color: colors.primaryDark, fontSize: 8, fontWeight: "700" },
  confirmText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" },
});
