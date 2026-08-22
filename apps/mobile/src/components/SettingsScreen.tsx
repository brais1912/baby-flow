import { LogOut } from "lucide-react";
import { formatAge } from "../i18n/format";
import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/messages";
import type { BabyProfile } from "../types/profile";
import { ProfileForm } from "./ProfileForm";

export function SettingsScreen({ email, profile, savingProfile, profileError, onSaveProfile, onSignOut }: {
  email: string | undefined;
  profile: BabyProfile;
  savingProfile: boolean;
  profileError: boolean;
  onSaveProfile: (profile: BabyProfile) => Promise<unknown>;
  onSignOut: () => Promise<void>;
}) {
  const { locale, setLocale, t } = useI18n();
  const languages: Array<{ value: Locale; label: string }> = [
    { value: "en", label: t("settings.english") },
    { value: "es", label: t("settings.spanish") },
  ];

  return (
    <section className="screen settings-screen">
      <div className="screen-heading">
        <p className="eyebrow">BabyFlow</p>
        <h1>{t("settings.title")}</h1>
      </div>

      <div className="settings-row">
        <div>
          <strong>{t("settings.account")}</strong>
          <span>{email}</span>
        </div>
        <button className="icon-command danger" type="button" onClick={() => void onSignOut()} title={t("settings.signOut")}>
          <LogOut size={19} />
          <span>{t("settings.signOut")}</span>
        </button>
      </div>

      <section className="settings-card">
        <div className="settings-card-heading">
          <strong>{t("settings.language")}</strong>
        </div>
        <div className="language-options" role="group" aria-label={t("settings.languageOptions")}>
          {languages.map((language) => (
            <button
              key={language.value}
              type="button"
              className={locale === language.value ? "active" : ""}
              aria-pressed={locale === language.value}
              onClick={() => void setLocale(language.value)}
            >
              {language.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <div>
            <strong>{t("settings.babyProfile")}</strong>
            <span>{formatAge(profile.dateOfBirth, locale)}</span>
          </div>
        </div>
        <ProfileForm
          key={`${profile.name}:${profile.dateOfBirth}`}
          initialProfile={profile}
          pending={savingProfile}
          saveError={profileError}
          onSave={onSaveProfile}
          submitLabel={t("profile.update")}
        />
      </section>
    </section>
  );
}
