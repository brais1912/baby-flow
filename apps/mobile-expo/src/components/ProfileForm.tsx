import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import { validateBabyProfile } from "../lib/profile";
import type { BabyProfile, ProfileFieldError, ProfileValidationErrors } from "../types/profile";
import { AppButton, Banner, Field, TextField } from "../ui/Core";
import { CalendarDateField } from "../ui/DateTimeFields";

export function ProfileForm({ initialProfile, pending, saveError, onSave, submitLabel }: {
  initialProfile: BabyProfile | null;
  pending: boolean;
  saveError: boolean;
  onSave: (profile: BabyProfile) => Promise<unknown>;
  submitLabel: string;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.dateOfBirth ?? "");
  const [errors, setErrors] = useState<ProfileValidationErrors>({});

  function errorMessage(field: "name" | "dateOfBirth", error: ProfileFieldError | undefined): string | null {
    if (!error) return null;
    if (field === "name") return t(error === "too_long" ? "profile.nameTooLong" : "profile.nameRequired");
    if (error === "required") return t("profile.birthRequired");
    if (error === "future") return t("profile.birthFuture");
    return t("profile.birthInvalid");
  }

  async function submit() {
    const next = { name: name.trim(), dateOfBirth };
    const validation = validateBabyProfile(next);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    await onSave(next).catch(() => undefined);
  }

  return (
    <View style={styles.form}>
      <Field label={t("profile.name")} error={errorMessage("name", errors.name)}>
        <TextField
          accessibilityLabel={t("profile.name")}
          maxLength={81}
          onChangeText={(value) => {
            setName(value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          value={name}
        />
      </Field>
      <CalendarDateField
        label={t("profile.dateOfBirth")}
        value={dateOfBirth}
        error={errorMessage("dateOfBirth", errors.dateOfBirth)}
        onChange={(value) => {
          setDateOfBirth(value);
          setErrors((current) => ({ ...current, dateOfBirth: undefined }));
        }}
      />
      {saveError ? <Banner>{t("profile.saveError")}</Banner> : null}
      <AppButton label={pending ? t("common.saving") : submitLabel} loading={pending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 14 } });
