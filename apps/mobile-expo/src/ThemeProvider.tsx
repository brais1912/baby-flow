import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import {
  darkColors,
  lightColors,
  resolveThemeColorScheme,
  themeShadows,
  type ThemeColors,
  type ThemeColorScheme,
  type ThemePreference,
  type ThemeShadows,
} from "./theme";

export const THEME_PREFERENCE_KEY = "babyflow-theme-preference";

type ThemeContextValue = {
  colors: ThemeColors;
  shadows: ThemeShadows;
  colorScheme: ThemeColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const defaultContext: ThemeContextValue = {
  colors: lightColors,
  shadows: themeShadows("light", lightColors),
  colorScheme: "light",
  preference: "system",
  setPreference: async () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContext);

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const saved = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  return isThemePreference(saved) ? saved : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void loadThemePreference()
      .then((saved) => {
        if (active) setPreferenceState(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
    }
  }, [preference]);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
  }, []);

  const colorScheme = resolveThemeColorScheme(preference, systemColorScheme);
  const value = useMemo<ThemeContextValue>(() => {
    const colors = colorScheme === "dark" ? darkColors : lightColors;
    return {
      colors,
      shadows: themeShadows(colorScheme, colors),
      colorScheme,
      preference,
      setPreference,
    };
  }, [colorScheme, preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
