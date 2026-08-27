import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors, ThemeShadows } from "../theme";

export type MobileTab = "events" | "reminders" | "insights" | "settings";

type SectionItem = {
  tab: MobileTab;
  label: string;
};

export function SectionSwitcher({
  activeTab,
  onSelect,
}: {
  activeTab: MobileTab;
  onSelect: (tab: MobileTab) => void;
}) {
  const { t } = useI18n();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [open, setOpen] = useState(false);
  const items: SectionItem[] = [
    { tab: "events", label: t("nav.events") },
    { tab: "reminders", label: t("nav.reminders") },
    { tab: "insights", label: t("nav.insights") },
    { tab: "settings", label: t("nav.settings") },
  ];
  const activeLabel = activeTab === "events"
    ? t("nav.events")
    : activeTab === "reminders"
      ? t("nav.reminders")
      : activeTab === "insights"
        ? t("nav.insights")
        : t("nav.settings");

  function select(tab: MobileTab) {
    setOpen(false);
    onSelect(tab);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("nav.main")}: ${activeLabel}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <SectionIcon tab={activeTab} color={colors.primaryDark} size={18} />
        <Text numberOfLines={1} style={styles.triggerLabel}>{activeLabel}</Text>
        <PathIcon path="M5 8l4 4 4-4" color={colors.primaryDark} size={18} />
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={open}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View
            accessibilityLabel={t("nav.main")}
            accessibilityViewIsModal
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeading}>
              <Text style={styles.sheetTitle}>{t("nav.main")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                hitSlop={8}
                onPress={() => setOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <PathIcon path="M5 5l8 8M13 5l-8 8" color={colors.textMuted} size={18} />
              </Pressable>
            </View>
            <View style={styles.grid} accessibilityRole="tablist">
              {items.map((item) => {
                const active = item.tab === activeTab;
                return (
                  <Pressable
                    key={item.tab}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => select(item.tab)}
                    style={({ pressed }) => [
                      styles.item,
                      active && styles.activeItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.iconWell, active && styles.activeIconWell]}>
                      <SectionIcon
                        tab={item.tab}
                        color={active ? colors.primaryDark : colors.textMuted}
                        size={23}
                      />
                    </View>
                    <Text style={[styles.itemLabel, active && styles.activeItemLabel]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SectionIcon({ tab, color, size }: { tab: MobileTab; color: string; size: number }) {
  if (tab === "events") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={8.25} fill="none" stroke={color} strokeWidth={2.1} />
        <Path d="M12 7.5v5l3.2 2" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} />
      </Svg>
    );
  }
  if (tab === "reminders") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Path d="M6.2 10.2a5.8 5.8 0 0 1 11.6 0v4.1l1.6 2.5H4.6l1.6-2.5v-4.1Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} />
        <Path d="M9.7 19a2.5 2.5 0 0 0 4.6 0" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.1} />
      </Svg>
    );
  }
  if (tab === "insights") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
        <Line x1={5} y1={18.5} x2={5} y2={12} stroke={color} strokeLinecap="round" strokeWidth={2.3} />
        <Line x1={12} y1={18.5} x2={12} y2={6} stroke={color} strokeLinecap="round" strokeWidth={2.3} />
        <Line x1={19} y1={18.5} x2={19} y2={9.5} stroke={color} strokeLinecap="round" strokeWidth={2.3} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeLinecap="round" strokeWidth={2.1} />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeLinecap="round" strokeWidth={2.1} />
      <Circle cx={9} cy={7} r={2.2} fill={color} />
      <Circle cx={15} cy={17} r={2.2} fill={color} />
    </Svg>
  );
}

function PathIcon({ path, color, size }: { path: string; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessible={false}>
      <Path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

function createStyles(colors: ThemeColors, shadows: ThemeShadows) {
  return StyleSheet.create({
  trigger: { maxWidth: 172, minHeight: 38, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 19, paddingHorizontal: 12, backgroundColor: colors.primarySoft },
  triggerLabel: { flexShrink: 1, color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 10, backgroundColor: colors.surface, ...shadows.card },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.handle, marginBottom: 14 },
  sheetHeading: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  closeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: colors.surfaceMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  item: { width: "48%", minHeight: 82, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: colors.surfaceMuted },
  activeItem: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  iconWell: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.surface },
  activeIconWell: { backgroundColor: colors.surface },
  itemLabel: { flex: 1, color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  activeItemLabel: { color: colors.primaryDark },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  });
}
