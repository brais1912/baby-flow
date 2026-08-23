import { format } from "date-fns";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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

export function EventCard({ event, allEvents, pending, onEdit, onDelete }: {
  event: BabyEvent;
  allEvents: BabyEvent[];
  pending: boolean;
  onEdit: (event: BabyEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const { dateLocale, locale, t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const detail = eventDetail(event, t);
  const phaseDuration = eventPhaseDuration(event, allEvents);
  const phaseDurationLabel = phaseDuration ? formatEventDuration(phaseDuration.durationMs, locale) : null;
  const tone = event.type === "sleep" ? colors.sleep : event.type === "wake_up" ? colors.awake : event.type === "feeding" ? colors.feeding : colors.diaper;

  if (confirming) {
    return (
      <View style={[styles.card, { borderLeftColor: tone }]}>
        <Text style={styles.confirmText}>{t("event.deleteConfirm")}</Text>
        <View style={styles.actions}>
          <IconButton label={t("common.cancel")} icon="×" disabled={pending} onPress={() => setConfirming(false)} />
          <IconButton label={t("common.delete")} icon="⌫" danger disabled={pending} onPress={() => void onDelete(event.id)} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderLeftColor: tone }]}>
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
      <View style={styles.meta}>
        <Text style={styles.time}>{format(event.occurredAt, "HH:mm", { locale: dateLocale })}</Text>
        <View style={styles.actions}>
          <IconButton label={t("event.editTime")} icon="✎" disabled={pending} onPress={() => onEdit(event)} />
          <IconButton label={t("common.delete")} icon="⌫" danger disabled={pending} onPress={() => setConfirming(true)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, padding: 12, minHeight: 78 },
  iconWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20 },
  copy: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  title: { color: colors.text, fontSize: 15, fontWeight: "800" },
  detail: { color: colors.textMuted, fontSize: 12 },
  notes: { color: colors.text, fontSize: 12, fontStyle: "italic" },
  meta: { alignItems: "flex-end", gap: 5 },
  time: { color: colors.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  awakeBadge: { backgroundColor: colors.awakeSoft },
  sleepBadge: { backgroundColor: colors.sleepSoft },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  quickBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  quickText: { color: colors.primaryDark, fontSize: 9, fontWeight: "700" },
  confirmText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
});
