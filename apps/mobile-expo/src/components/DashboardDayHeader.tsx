import { format } from "date-fns";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import { Card, IconButton } from "../ui/Core";

export function DashboardDayHeader({
  babyName,
  bounds,
  isToday,
  loading,
  selectedDay,
  onNext,
  onPrevious,
  onToday,
}: {
  babyName: string;
  bounds: { start: Date; end: Date };
  isToday: boolean;
  loading: boolean;
  selectedDay: Date;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
}) {
  const { dateLocale, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const title = isToday
    ? t("dashboard.todayFor", { name: babyName })
    : format(selectedDay, "EEEE, d MMMM yyyy", { locale: dateLocale });
  const range = `${format(bounds.start, "EEE d MMM, HH:mm", { locale: dateLocale })} – ${format(bounds.end, "EEE d MMM, HH:mm", { locale: dateLocale })}`;

  return (
    <Card style={styles.card}>
      <View style={styles.navigationRow}>
        <IconButton compact label={t("dashboard.previousDay")} icon="‹" disabled={loading} onPress={onPrevious} />
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.range}>{range}</Text>
        </View>
        <IconButton compact label={t("dashboard.nextDay")} icon="›" disabled={isToday || loading} onPress={onNext} />
      </View>
      {!isToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("dashboard.returnToday")}
          disabled={loading}
          hitSlop={8}
          onPress={onToday}
          style={({ pressed }) => [styles.todayButton, pressed && styles.pressed, loading && styles.disabled]}
        >
          <Text style={styles.todayLabel}>↩ {t("dashboard.returnToday")}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: { gap: 4, paddingHorizontal: 10, paddingVertical: 9 },
  navigationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  copy: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  title: { color: colors.text, fontSize: 17, lineHeight: 21, fontWeight: "800", textAlign: "center" },
  range: { color: colors.primaryDark, fontSize: 10, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  todayButton: { minHeight: 28, alignSelf: "center", justifyContent: "center", paddingHorizontal: 10 },
  todayLabel: { color: colors.primary, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
  });
}
