import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import { colors, shadows } from "../theme";
import type { EventInput, EventType } from "../types/events";

const actions: { type: EventType; emoji: string; label: MessageKey; color: string }[] = [
  { type: "sleep", emoji: "😴", label: "quick.sleep", color: colors.sleepSoft },
  { type: "wake_up", emoji: "🌅", label: "quick.wake", color: colors.awakeSoft },
  { type: "feeding", emoji: "🍼", label: "quick.feed", color: colors.feedingSoft },
  { type: "diaper", emoji: "👶", label: "quick.diaper", color: colors.diaperSoft },
];

export function QuickLogBar({ disabled, onCreate, onOpenDetailed }: {
  disabled: boolean;
  onCreate: (input: EventInput) => Promise<unknown>;
  onOpenDetailed: () => void;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState<EventType | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function log(type: EventType) {
    try {
      await onCreate({ type, occurredAt: new Date(), notes: "QuickLog" });
      setSaved(type);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(null), 1000);
    } catch {
      setSaved(null);
    }
  }

  return (
    <View style={styles.bar} accessibilityLabel={t("quick.label")}>
      <View style={styles.heading}>
        <Text style={styles.headingLabel}>{t("quick.label")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.newDetailed")}
          disabled={disabled}
          onPress={onOpenDetailed}
          style={({ pressed }) => [styles.detailedButton, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <Text style={styles.detailedLabel}>＋ {t("dashboard.newDetailed")}</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.type}
            accessibilityRole="button"
            accessibilityLabel={t(action.label)}
            disabled={disabled}
            onPress={() => void log(action.type)}
            style={({ pressed }) => [styles.action, { backgroundColor: action.color }, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Text style={styles.emoji}>{saved === action.type ? "✓" : action.emoji}</Text>
            <Text style={styles.label}>{saved === action.type ? t("quick.saved") : t(action.label)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 6, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 7, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, ...shadows.card },
  heading: { minHeight: 27, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 3 },
  headingLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  detailedButton: { minHeight: 27, borderRadius: 10, backgroundColor: colors.primary, justifyContent: "center", paddingHorizontal: 10 },
  detailedLabel: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 7 },
  action: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2 },
  emoji: { fontSize: 18 },
  label: { color: colors.text, fontSize: 10, fontWeight: "700" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
});
