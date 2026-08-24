import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { colors, shadows } from "../theme";
import { IconButton } from "./Core";

type ChartDetailTone = "neutral" | "sleep" | "feeding" | "diaper";

const toneColors: Record<ChartDetailTone, { accent: string; soft: string }> = {
  neutral: { accent: colors.primary, soft: colors.primarySoft },
  sleep: { accent: colors.sleep, soft: colors.sleepSoft },
  feeding: { accent: colors.feeding, soft: colors.feedingSoft },
  diaper: { accent: colors.diaper, soft: colors.diaperSoft },
};

export function ChartDetailDialog({ visible, eyebrow, title, subtitle, icon, tone = "neutral", children, onClose }: {
  visible: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: string;
  tone?: ChartDetailTone;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const palette = toneColors[tone];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.layer}>
        <Pressable
          accessible={false}
          onPress={onClose}
          style={styles.backdrop}
          testID="chart-detail-backdrop"
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          testID="chart-detail-dialog"
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            {icon ? (
              <View style={[styles.iconBadge, { backgroundColor: palette.soft }]}>
                <Text style={styles.icon}>{icon}</Text>
              </View>
            ) : null}
            <View style={styles.headingCopy}>
              {eyebrow ? <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <IconButton compact icon="×" label={t("common.close")} onPress={onClose} />
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(28, 22, 34, 0.5)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 15,
    paddingHorizontal: 20,
    paddingTop: 9,
    width: "100%",
    ...shadows.card,
  },
  handle: { alignSelf: "center", backgroundColor: "#d2cad9", borderRadius: 3, height: 5, marginBottom: 3, width: 42 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  icon: { fontSize: 24 },
  headingCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  content: { gap: 12 },
});
