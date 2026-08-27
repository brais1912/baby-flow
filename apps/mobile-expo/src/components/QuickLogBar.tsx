import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { View as NativeView } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import type { EventInput, EventType } from "../types/events";

type QuickAction = {
  type: EventType;
  emoji: string;
  label: MessageKey;
  color: string;
};

export function QuickLogBar({
  blurTarget,
  bottomInset,
  compact,
  disabled,
  onCreate,
  onOpenDetailed,
}: {
  blurTarget: RefObject<NativeView | null>;
  bottomInset: number;
  compact: boolean;
  disabled: boolean;
  onCreate: (input: EventInput) => Promise<unknown>;
  onOpenDetailed: () => void;
}) {
  const { t } = useI18n();
  const { colorScheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, colorScheme), [colorScheme, colors]);
  const actionAlpha = colorScheme === "dark" ? "8F" : "70";
  const actions: QuickAction[] = [
    { type: "sleep", emoji: "😴", label: "quick.sleep", color: `${colors.sleepSoft}${actionAlpha}` },
    { type: "wake_up", emoji: "🌅", label: "quick.wake", color: `${colors.awakeSoft}${actionAlpha}` },
    { type: "feeding", emoji: "🍼", label: "quick.feed", color: `${colors.feedingSoft}${actionAlpha}` },
    { type: "diaper", emoji: "👶", label: "quick.diaper", color: `${colors.diaperSoft}${actionAlpha}` },
  ];
  const [saved, setSaved] = useState<EventType | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress] = useState(() => new Animated.Value(compact ? 1 : 0));

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: compact ? 1 : 0,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [compact, progress]);

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

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [72, 56] });
  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  return (
    <View style={[styles.layer, { bottom: bottomInset }]}>
      <Animated.View style={[styles.shadow, { height, transform: [{ scaleX }] }]}>
        <BlurView
          blurMethod="dimezisBlurViewSdk31Plus"
          blurTarget={blurTarget}
          intensity={10}
          tint={colorScheme === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
          style={styles.glass}
        >
          <View style={styles.glassTint} />

          {!compact ? <View style={styles.expanded}>
            {actions.map((action) => (
              <Pressable
                key={action.type}
                accessibilityRole="button"
                accessibilityLabel={t(action.label)}
                disabled={disabled}
                onPress={() => void log(action.type)}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: action.color },
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.emoji}>{saved === action.type ? "✓" : action.emoji}</Text>
                <Text numberOfLines={1} style={styles.label}>
                  {saved === action.type ? t("quick.saved") : t(action.label)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("dashboard.newDetailed")}
              disabled={disabled}
              onPress={onOpenDetailed}
              style={({ pressed }) => [
                styles.detailedButton,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={styles.detailedLabel}>＋</Text>
            </Pressable>
          </View> : null}

          {compact ? <View style={styles.compact}>
            {actions.map((action) => (
              <Pressable
                key={action.type}
                accessibilityRole="button"
                accessibilityLabel={t(action.label)}
                disabled={disabled}
                onPress={() => void log(action.type)}
                style={({ pressed }) => [
                  styles.compactAction,
                  { backgroundColor: action.color },
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text style={styles.compactEmoji}>{saved === action.type ? "✓" : action.emoji}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("dashboard.newDetailed")}
              disabled={disabled}
              onPress={onOpenDetailed}
              style={({ pressed }) => [
                styles.compactDetailed,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={styles.compactDetailedLabel}>＋</Text>
            </Pressable>
          </View> : null}
        </BlurView>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors, colorScheme: "light" | "dark") {
  return StyleSheet.create({
  layer: { position: "absolute", left: 12, right: 12, zIndex: 40, pointerEvents: "box-none" },
  shadow: {
    borderRadius: 26,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: colorScheme === "dark" ? 0.34 : 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  glass: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.3)",
  },
  glassTint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: "none",
    backgroundColor: colorScheme === "dark" ? "rgba(24,20,29,0.05)" : "rgba(255,255,255,0.02)",
  },
  expanded: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", alignItems: "center", gap: 6, padding: 7 },
  detailedButton: { width: 48, height: 58, borderRadius: 18, backgroundColor: `${colors.primary}${colorScheme === "dark" ? "C2" : "B3"}`, alignItems: "center", justifyContent: "center" },
  detailedLabel: { color: colors.onPrimary, fontSize: 28, lineHeight: 31, fontWeight: "500" },
  action: { flex: 1, minWidth: 54, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 1 },
  emoji: { fontSize: 18 },
  label: { color: colors.text, fontSize: 10, fontWeight: "700" },
  compact: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, flexDirection: "row", alignItems: "center", gap: 6, padding: 6 },
  compactAction: { flex: 1, minWidth: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 17 },
  compactEmoji: { fontSize: 19 },
  compactDetailed: { flex: 1, minWidth: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: `${colors.primary}${colorScheme === "dark" ? "C2" : "B3"}` },
  compactDetailedLabel: { color: colors.onPrimary, fontSize: 27, lineHeight: 30, fontWeight: "500" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
  });
}
