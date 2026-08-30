import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/messages";
import { useTheme } from "../ThemeProvider";
import type { ThemeColors, ThemeShadows } from "../theme";
import type {
  BabyEvent,
  DiaperType,
  EventInput,
  EventType,
  FeedingType,
  SleepMethod,
} from "../types/events";
import { AppButton, Banner, ChoiceChips, Field, IconButton, TextField } from "../ui/Core";
import { DateTimeField } from "../ui/DateTimeFields";

const typeOptions: { value: EventType; label: MessageKey; emoji: string }[] = [
  { value: "sleep", label: "quick.sleep", emoji: "😴" },
  { value: "wake_up", label: "quick.wake", emoji: "🌅" },
  { value: "feeding", label: "quick.feed", emoji: "🍼" },
  { value: "diaper", label: "quick.diaper", emoji: "👶" },
];

export function EventSheet({ event, pending, error, onClose, onCreate, onUpdateTime }: {
  event: BabyEvent | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: EventInput) => Promise<unknown>;
  onUpdateTime: (event: BabyEvent, occurredAt: Date) => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<EventType>(event?.type ?? "sleep");
  const [occurredAt, setOccurredAt] = useState(event?.occurredAt ?? new Date());
  const [notes, setNotes] = useState(event?.notes === "QuickLog" ? "" : event?.notes ?? "");
  const [sleepMethod, setSleepMethod] = useState<SleepMethod | "">(event?.sleepMethod ?? "");
  const [feedingType, setFeedingType] = useState<FeedingType | "">(event?.feedingType ?? "");
  const [feedingAmountMl, setFeedingAmountMl] = useState(event?.feedingAmountMl?.toString() ?? "");
  const [diaperType, setDiaperType] = useState<DiaperType | "">(event?.diaperType ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    if (!event && type === "diaper" && !diaperType) {
      setLocalError(t("event.select"));
      return;
    }
    setLocalError(null);
    try {
      if (event) {
        await onUpdateTime(event, occurredAt);
      } else {
        await onCreate({
          type,
          occurredAt,
          notes: notes.trim() || null,
          sleepMethod: type === "sleep" ? sleepMethod || null : null,
          feedingType: type === "feeding" ? feedingType || null : null,
          feedingAmountMl: type === "feeding" && feedingAmountMl ? Number(feedingAmountMl) : null,
          diaperType: type === "diaper" ? diaperType || null : null,
        });
      }
      onClose();
    } catch {
      return;
    }
  }

  const translatedTypes = typeOptions.map((option) => ({ ...option, label: t(option.label) }));
  const noneOption = { value: "" as const, label: t("common.notSpecified") };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.layer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{event ? t("event.editTimeTitle") : t("event.new")}</Text>
            <IconButton label={t("common.close")} icon="×" disabled={pending} onPress={onClose} />
          </View>
          <ScrollView
            testID="event-sheet-fields"
            style={styles.formScroll}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!event ? (
              <Field label={t("event.type")}>
                <ChoiceChips accessibilityLabel={t("event.type")} value={type} options={translatedTypes} onChange={setType} />
              </Field>
            ) : null}

            <DateTimeField label={t("event.dateTime")} value={occurredAt} onChange={setOccurredAt} />

            {!event && type === "sleep" ? (
              <Field label={t("event.sleepMethod")}>
                <ChoiceChips
                  accessibilityLabel={t("event.sleepMethod")}
                  value={sleepMethod}
                  onChange={setSleepMethod}
                  options={[
                    noneOption,
                    { value: "self", label: t("event.self") },
                    { value: "nursing", label: t("event.nursing") },
                    { value: "bottle", label: t("event.bottle") },
                    { value: "pacifier", label: t("event.pacifier") },
                    { value: "held", label: t("event.held") },
                    { value: "rocking", label: t("event.rocking") },
                    { value: "other", label: t("common.other") },
                  ]}
                />
              </Field>
            ) : null}

            {!event && type === "feeding" ? (
              <>
                <Field label={t("event.feedingType")}>
                  <ChoiceChips
                    accessibilityLabel={t("event.feedingType")}
                    value={feedingType}
                    onChange={setFeedingType}
                    options={[
                      noneOption,
                      { value: "breast_left", label: t("event.leftBreast") },
                      { value: "breast_right", label: t("event.rightBreast") },
                      { value: "both_breasts", label: t("event.bothBreasts") },
                      { value: "bottle", label: t("event.bottle") },
                      { value: "formula", label: t("event.formula") },
                      { value: "solid", label: t("event.solid") },
                    ]}
                  />
                </Field>
                <Field label={t("event.amountMl")}>
                  <TextField accessibilityLabel={t("event.amountMl")} keyboardType="number-pad" value={feedingAmountMl} onChangeText={setFeedingAmountMl} />
                </Field>
              </>
            ) : null}

            {!event && type === "diaper" ? (
              <Field label={t("event.diaperType")}>
                <ChoiceChips
                  accessibilityLabel={t("event.diaperType")}
                  value={diaperType}
                  onChange={setDiaperType}
                  options={[
                    { value: "", label: t("event.select") },
                    { value: "pee", label: t("event.pee") },
                    { value: "poop", label: t("event.poop") },
                    { value: "both", label: t("event.both") },
                  ]}
                />
              </Field>
            ) : null}

            {!event ? (
              <Field label={t("event.notes")}>
                <TextField accessibilityLabel={t("event.notes")} multiline maxLength={500} value={notes} onChangeText={setNotes} />
              </Field>
            ) : null}
          </ScrollView>
          <View
            testID="event-sheet-footer"
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}
          >
            {localError || error ? <Banner>{localError ?? error}</Banner> : null}
            <AppButton label={pending ? t("common.saving") : t("common.save")} loading={pending} onPress={() => void submit()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, shadows: ThemeShadows) {
  return StyleSheet.create({
  layer: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: { maxHeight: "88%", overflow: "hidden", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.background, paddingTop: 8, ...shadows.card },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.handle, alignSelf: "center", marginBottom: 7 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  formScroll: { flexShrink: 1 },
  form: { paddingHorizontal: 18, paddingBottom: 15, gap: 15 },
  footer: { flexShrink: 0, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 18, paddingTop: 12 },
  });
}
