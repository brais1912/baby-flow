import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "../components/LoginScreen";
import { I18nProvider, LANGUAGE_PREFERENCE_KEY, resolveLocale, useI18n } from "./I18nProvider";

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  get: vi.fn(async ({ key }: { key: string }) => ({ value: mocks.values.get(key) ?? null })),
  set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
    mocks.values.set(key, value);
  }),
  reschedule: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: mocks.get, set: mocks.set },
}));

vi.mock("../lib/notificationService", () => ({
  rescheduleDailyReminder: mocks.reschedule,
}));

function Probe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span>{locale}</span>
      <strong>{t("nav.settings")}</strong>
      <button type="button" onClick={() => void setLocale(locale === "en" ? "es" : "en")}>switch</button>
    </div>
  );
}

describe("mobile locale resolution", () => {
  it("prefers a saved locale, then a supported device locale, then English", () => {
    expect(resolveLocale("en", ["es-ES"])).toBe("en");
    expect(resolveLocale(null, ["es-ES", "en-US"])).toBe("es");
    expect(resolveLocale(null, ["fr-FR"])).toBe("en");
  });
});

describe("I18nProvider", () => {
  beforeEach(() => {
    mocks.values.clear();
    mocks.values.set(LANGUAGE_PREFERENCE_KEY, "es");
    vi.clearAllMocks();
  });

  it("renders the saved locale, switches immediately, persists, and restores it", async () => {
    const user = userEvent.setup();
    const first = render(<I18nProvider><Probe /></I18nProvider>);

    expect(await screen.findByText("Ajustes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "switch" }));
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(mocks.set).toHaveBeenCalledWith({ key: LANGUAGE_PREFERENCE_KEY, value: "en" });
    expect(mocks.reschedule).toHaveBeenCalledWith("en");

    first.unmount();
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("renders an unauthenticated surface completely in Spanish", async () => {
    render(
      <I18nProvider>
        <LoginScreen
          error={null}
          onClearError={vi.fn()}
          onSignIn={vi.fn()}
          onSignUp={vi.fn()}
          onPasswordReset={vi.fn()}
        />
      </I18nProvider>
    );

    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByText("¿Has olvidado la contraseña?")).toBeInTheDocument();
  });
});
