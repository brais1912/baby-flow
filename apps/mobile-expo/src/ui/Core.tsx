import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";
import { colors, shadows } from "../theme";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <View style={styles.brand} accessibilityLabel="BabyFlow">
      <View style={[styles.brandMark, large && styles.brandMarkLarge]} />
      <Text style={[styles.brandText, large && styles.brandTextLarge]}>BabyFlow</Text>
    </View>
  );
}

export function Card({ children, style }: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({ label, onPress, disabled = false, loading = false, tone = "primary", icon, compact = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger" | "text";
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        styles[`${tone}Button`],
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {loading ? <ActivityIndicator color={tone === "primary" ? "#ffffff" : colors.primary} /> : icon}
      <Text style={[styles.buttonLabel, compact && styles.buttonLabelCompact, styles[`${tone}ButtonLabel`]]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ label, icon, onPress, disabled = false, danger = false, compact = false }: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        compact && styles.iconButtonCompact,
        danger && styles.iconButtonDanger,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {typeof icon === "string" ? (
        <Text style={[styles.iconButtonText, compact && styles.iconButtonTextCompact, danger && styles.dangerText]}>{icon}</Text>
      ) : icon}
    </Pressable>
  );
}

export function Field({ label, error, children }: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

export function TextField({ value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, maxLength, editable = true, accessibilityLabel, autoCapitalize = "sentences" }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
  accessibilityLabel: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      autoCorrect={!secureTextEntry}
      editable={editable}
      keyboardType={keyboardType}
      maxLength={maxLength}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      secureTextEntry={secureTextEntry}
      style={[styles.input, multiline && styles.multilineInput, !editable && styles.inputDisabled]}
      value={value}
    />
  );
}

export function Banner({ children, tone = "error" }: {
  children: ReactNode;
  tone?: "error" | "success" | "warning" | "neutral";
}) {
  const role = tone === "error" ? "alert" : undefined;
  return (
    <View style={[styles.banner, styles[`${tone}Banner`]]} accessibilityRole={role}>
      <Text style={[styles.bannerText, tone === "error" && styles.dangerText]}>{children}</Text>
    </View>
  );
}

export function ChoiceChips<T extends string>({ value, options, onChange, accessibilityLabel, disabled = false }: {
  value: T;
  options: readonly { value: T; label: string; emoji?: string }[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chips} accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
          >
            {option.emoji ? <Text style={styles.chipEmoji}>{option.emoji}</Text> : null}
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const coreStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 14 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gap: { gap: 12 },
});

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 25, height: 25, borderRadius: 9, backgroundColor: colors.primary, transform: [{ rotate: "12deg" }] },
  brandMarkLarge: { width: 52, height: 52, borderRadius: 18 },
  brandText: { color: colors.text, fontSize: 19, fontWeight: "900" },
  brandTextLarge: { fontSize: 30 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 16, ...shadows.card },
  button: { minHeight: 48, borderRadius: 14, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1 },
  buttonCompact: { minHeight: 38, borderRadius: 12, paddingHorizontal: 14, gap: 7 },
  primaryButton: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border },
  dangerButton: { backgroundColor: colors.dangerSoft, borderColor: "#f6c9d1" },
  textButton: { backgroundColor: "transparent", borderColor: "transparent", minHeight: 40 },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { fontSize: 15, fontWeight: "700" },
  buttonLabelCompact: { fontSize: 13 },
  primaryButtonLabel: { color: "#ffffff" },
  secondaryButtonLabel: { color: colors.text },
  dangerButtonLabel: { color: colors.danger },
  textButtonLabel: { color: colors.primary },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  iconButtonCompact: { width: 34, height: 34, borderRadius: 10 },
  iconButtonDanger: { backgroundColor: colors.dangerSoft },
  iconButtonText: { color: colors.text, fontSize: 22, fontWeight: "700" },
  iconButtonTextCompact: { fontSize: 17 },
  dangerText: { color: colors.danger },
  field: { gap: 7 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700" },
  fieldError: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  multilineInput: { minHeight: 86, paddingTop: 12, textAlignVertical: "top" },
  inputDisabled: { backgroundColor: colors.surfaceMuted, opacity: 0.65 },
  banner: { borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  errorBanner: { backgroundColor: colors.dangerSoft, borderColor: "#f4cbd2" },
  successBanner: { backgroundColor: colors.successSoft, borderColor: "#bfe6d3" },
  warningBanner: { backgroundColor: colors.warningSoft, borderColor: "#f2d995" },
  neutralBanner: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  bannerText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipEmoji: { fontSize: 17 },
  chipLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  chipLabelSelected: { color: colors.primaryDark },
});
