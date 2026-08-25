import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import { parseCalendarDate } from "../lib/profile";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors } from "../theme";
import { AppButton, Field } from "./Core";

type PickerMode = "date" | "time";

function PickerButton({ label, value, onPress, disabled = false }: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerValue}>{value}</Text>
    </Pressable>
  );
}

export function DateTimeField({ label, value, onChange, maximumDate }: {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  maximumDate?: Date;
}) {
  const { dateLocale, t } = useI18n();
  const { colorScheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<PickerMode | null>(null);

  function change(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setMode(null);
    if (event.type !== "dismissed" && selected) onChange(selected);
  }

  return (
    <Field label={label}>
      <View style={styles.row}>
        <PickerButton label={t("profile.dateOfBirth")} value={format(value, "d MMM yyyy", { locale: dateLocale })} onPress={() => setMode("date")} />
        <PickerButton label={t("reminder.dailyTime")} value={format(value, "HH:mm", { locale: dateLocale })} onPress={() => setMode("time")} />
      </View>
      {mode ? (
        <View style={styles.inlinePicker}>
          <DateTimePicker
            accentColor={colors.primary}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={maximumDate}
            minuteInterval={5}
            mode={mode}
            onChange={change}
            themeVariant={colorScheme}
            value={value}
          />
          {Platform.OS === "ios" ? <AppButton label={t("common.close")} tone="text" onPress={() => setMode(null)} /> : null}
        </View>
      ) : null}
    </Field>
  );
}

export function CalendarDateField({ label, value, onChange, error }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const { dateLocale, t } = useI18n();
  const { colorScheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const selected = parseCalendarDate(value) ?? new Date();

  function change(event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (event.type !== "dismissed" && next) onChange(format(next, "yyyy-MM-dd"));
  }

  return (
    <Field label={label} error={error}>
      <PickerButton
        label={label}
        value={value ? format(selected, "d MMM yyyy", { locale: dateLocale }) : t("event.select")}
        onPress={() => setOpen(true)}
      />
      {open ? (
        <View style={styles.inlinePicker}>
          <DateTimePicker
            accentColor={colors.primary}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            mode="date"
            onChange={change}
            themeVariant={colorScheme}
            value={selected}
          />
          {Platform.OS === "ios" ? <AppButton label={t("common.close")} tone="text" onPress={() => setOpen(false)} /> : null}
        </View>
      ) : null}
    </Field>
  );
}

export function TimeField({ label, value, onChange, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const { colorScheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [hour = 20, minute = 0] = value.split(":").map(Number);
  const selected = new Date();
  selected.setHours(hour, minute, 0, 0);

  function change(event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (event.type !== "dismissed" && next) onChange(format(next, "HH:mm"));
  }

  return (
    <Field label={label}>
      <PickerButton label={label} value={value} disabled={disabled} onPress={() => setOpen(true)} />
      {open && !disabled ? (
        <View style={styles.inlinePicker}>
          <DateTimePicker
            accentColor={colors.primary}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minuteInterval={5}
            mode="time"
            onChange={change}
            themeVariant={colorScheme}
            value={selected}
          />
          {Platform.OS === "ios" ? <AppButton label={t("common.close")} tone="text" onPress={() => setOpen(false)} /> : null}
        </View>
      ) : null}
    </Field>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  pickerButton: { flex: 1, minHeight: 52, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center", gap: 2 },
  pickerLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  pickerValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  inlinePicker: { borderRadius: 14, backgroundColor: colors.surfaceMuted, overflow: "hidden", padding: 4 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  });
}
