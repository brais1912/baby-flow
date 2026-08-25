export type ThemePreference = "system" | "light" | "dark";
export type ThemeColorScheme = "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  sleep: string;
  sleepSoft: string;
  sleepBorder: string;
  awake: string;
  awakeSoft: string;
  awakeBorder: string;
  feeding: string;
  feedingSoft: string;
  diaper: string;
  diaperSoft: string;
  diaperPee: string;
  diaperPoop: string;
  diaperBoth: string;
  night: string;
  nightSoft: string;
  overlay: string;
  handle: string;
  shadow: string;
  switchTrack: string;
  switchThumb: string;
};

export type ThemeShadows = {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export const lightColors: ThemeColors = {
  background: "#f7f4fb",
  surface: "#ffffff",
  surfaceMuted: "#f2eef7",
  border: "#e5deec",
  text: "#28232d",
  textMuted: "#746d7b",
  primary: "#7c3aed",
  primaryDark: "#6430c7",
  primarySoft: "#ede5ff",
  onPrimary: "#ffffff",
  danger: "#c53d51",
  dangerSoft: "#fde9ed",
  dangerBorder: "#f4cbd2",
  success: "#28835d",
  successSoft: "#e3f5ec",
  successBorder: "#bfe6d3",
  warning: "#a86d00",
  warningSoft: "#fff3d6",
  warningBorder: "#f2d995",
  sleep: "#8b5bc8",
  sleepSoft: "#eee5f8",
  sleepBorder: "#d8c5ec",
  awake: "#e68a2e",
  awakeSoft: "#fff0df",
  awakeBorder: "#f5d0a7",
  feeding: "#3989ce",
  feedingSoft: "#e4f1fc",
  diaper: "#d5a52a",
  diaperSoft: "#fff5d7",
  diaperPee: "#e8b923",
  diaperPoop: "#98623a",
  diaperBoth: "#e47a36",
  night: "#5664b6",
  nightSoft: "#e8eafb",
  overlay: "rgba(28, 22, 34, 0.5)",
  handle: "#d2cad9",
  shadow: "#241c2c",
  switchTrack: "#b99af4",
  switchThumb: "#ffffff",
};

export const darkColors: ThemeColors = {
  background: "#151219",
  surface: "#211c26",
  surfaceMuted: "#2c2632",
  border: "#443a4d",
  text: "#f6f0fa",
  textMuted: "#b8aec1",
  primary: "#a78bfa",
  primaryDark: "#c4b5fd",
  primarySoft: "#382d51",
  onPrimary: "#1b1325",
  danger: "#fb7185",
  dangerSoft: "#47232c",
  dangerBorder: "#713541",
  success: "#61dca2",
  successSoft: "#193b2d",
  successBorder: "#2c664d",
  warning: "#f4bd57",
  warningSoft: "#49381b",
  warningBorder: "#72592d",
  sleep: "#b998eb",
  sleepSoft: "#3b2d4e",
  sleepBorder: "#624a7c",
  awake: "#f5a451",
  awakeSoft: "#4a321f",
  awakeBorder: "#79512e",
  feeding: "#67afe9",
  feedingSoft: "#203b50",
  diaper: "#e4bd57",
  diaperSoft: "#453b20",
  diaperPee: "#f0c94f",
  diaperPoop: "#c98d61",
  diaperBoth: "#f2975d",
  night: "#8e9aeb",
  nightSoft: "#2d3459",
  overlay: "rgba(5, 4, 7, 0.72)",
  handle: "#665b70",
  shadow: "#000000",
  switchTrack: "#8066bb",
  switchThumb: "#f6f0fa",
};

export function resolveThemeColorScheme(
  preference: ThemePreference,
  systemColorScheme: string | null | undefined
): ThemeColorScheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemColorScheme === "dark" ? "dark" : "light";
}

export function themeShadows(colorScheme: ThemeColorScheme, colors: ThemeColors): ThemeShadows {
  return {
    card: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colorScheme === "dark" ? 0.24 : 0.07,
      shadowRadius: 12,
      elevation: 2,
    },
  };
}
