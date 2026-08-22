import { useState } from "react";
import { Save } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { validateBabyProfile } from "../lib/profile";
import type { BabyProfile, ProfileFieldError, ProfileValidationErrors } from "../types/profile";

function todayValue(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { name: name.trim(), dateOfBirth };
    const validation = validateBabyProfile(next);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    try {
      await onSave(next);
    } catch {
      return;
    }
  }

  const nameError = errorMessage("name", errors.name);
  const birthError = errorMessage("dateOfBirth", errors.dateOfBirth);

  return (
    <form className="event-form profile-form" onSubmit={(event) => void submit(event)} noValidate>
      <label>
        {t("profile.name")}
        <input
          type="text"
          autoComplete="name"
          maxLength={81}
          value={name}
          aria-invalid={Boolean(nameError)}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        {nameError && <span className="field-error">{nameError}</span>}
      </label>
      <label>
        {t("profile.dateOfBirth")}
        <input
          type="date"
          max={todayValue()}
          value={dateOfBirth}
          aria-invalid={Boolean(birthError)}
          onChange={(event) => {
            setDateOfBirth(event.target.value);
            setErrors((current) => ({ ...current, dateOfBirth: undefined }));
          }}
        />
        {birthError && <span className="field-error">{birthError}</span>}
      </label>
      {saveError && <p className="error-banner" role="alert">{t("profile.saveError")}</p>}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? <span className="spinner small" aria-label={t("common.saving")} /> : <Save size={18} />}
        <span>{pending ? t("common.saving") : submitLabel}</span>
      </button>
    </form>
  );
}
