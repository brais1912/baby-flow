import { LogOut } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import type { BabyProfile } from "../types/profile";
import { ProfileForm } from "./ProfileForm";

export function ProfileOnboarding({ saving, error, onSave, onSignOut }: {
  saving: boolean;
  error: boolean;
  onSave: (profile: BabyProfile) => Promise<unknown>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <main className="login-screen onboarding-screen">
      <div className="login-brand">
        <span className="brand-mark large" aria-hidden="true" />
        <h1>{t("profile.onboardingTitle")}</h1>
        <p>{t("profile.onboardingBody")}</p>
      </div>
      <ProfileForm
        initialProfile={null}
        pending={saving}
        saveError={error}
        onSave={onSave}
        submitLabel={t("profile.save")}
      />
      <button className="secondary-button danger" type="button" onClick={() => void onSignOut()}>
        <LogOut size={18} />
        <span>{t("settings.signOut")}</span>
      </button>
    </main>
  );
}
