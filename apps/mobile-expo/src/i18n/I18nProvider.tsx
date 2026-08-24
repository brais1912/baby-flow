import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { enUS, es } from "date-fns/locale";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale as DateFnsLocale } from "date-fns";
import type { MessageKey, Locale } from "./messages";
import { translate } from "./messages";
import { rescheduleDailyReminder } from "../lib/notificationService";

export const LANGUAGE_PREFERENCE_KEY = "babyflow-language";

export function resolveLocale(saved: string | null, deviceLocales: readonly string[]): Locale {
  if (saved === "en" || saved === "es") return saved;
  for (const deviceLocale of deviceLocales) {
    const language = deviceLocale.toLowerCase().split(/[-_]/)[0];
    if (language === "en" || language === "es") return language;
  }
  return "en";
}

type I18nContextValue = {
  locale: Locale;
  dateLocale: DateFnsLocale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const defaultValue: I18nContextValue = {
  locale: "en",
  dateLocale: enUS,
  setLocale: async () => undefined,
  t: (key, values) => translate("en", key, values),
};

const I18nContext = createContext<I18nContextValue>(defaultValue);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY)
      .then((saved) => {
        if (!active) return;
        const resolved = resolveLocale(saved, getLocales().map(({ languageTag }) => languageTag));
        setCurrentLocale(resolved);
        void rescheduleDailyReminder(resolved).catch(() => undefined);
      })
      .catch(() => {
        if (active) setCurrentLocale("en");
      });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    setCurrentLocale(nextLocale);
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, nextLocale);
    await rescheduleDailyReminder(nextLocale).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale: locale ?? "en",
    dateLocale: locale === "es" ? es : enUS,
    setLocale,
    t: (key, values) => translate(locale ?? "en", key, values),
  }), [locale, setLocale]);

  if (locale === null) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
