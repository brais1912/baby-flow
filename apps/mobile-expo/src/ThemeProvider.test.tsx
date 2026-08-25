import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pressable, Text, View } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./components/SettingsScreen";
import {
  THEME_PREFERENCE_KEY,
  ThemeProvider,
  useTheme,
} from "./ThemeProvider";
import { resolveThemeColorScheme } from "./theme";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

function ThemeHarness() {
  const { colorScheme, preference, setPreference } = useTheme();
  return (
    <View>
      <Text>{`preference:${preference}`}</Text>
      <Text>{`scheme:${colorScheme}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => void setPreference("dark")}>
        <Text>Choose dark</Text>
      </Pressable>
    </View>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it("applies a manual override immediately and restores it after remounting", async () => {
    const user = userEvent.setup();
    const first = render(<ThemeProvider><ThemeHarness /></ThemeProvider>);
    await waitFor(() => expect(screen.getByText("preference:system")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Choose dark" }));

    expect(screen.getByText("preference:dark")).toBeInTheDocument();
    expect(screen.getByText("scheme:dark")).toBeInTheDocument();
    expect(storage.get(THEME_PREFERENCE_KEY)).toBe("dark");

    first.unmount();
    render(<ThemeProvider><ThemeHarness /></ThemeProvider>);
    await waitFor(() => expect(screen.getByText("preference:dark")).toBeInTheDocument());
    expect(screen.getByText("scheme:dark")).toBeInTheDocument();
  });

  it("follows the system only when the preference has no manual override", () => {
    expect(resolveThemeColorScheme("system", "dark")).toBe("dark");
    expect(resolveThemeColorScheme("system", "light")).toBe("light");
    expect(resolveThemeColorScheme("system", null)).toBe("light");
    expect(resolveThemeColorScheme("light", "dark")).toBe("light");
    expect(resolveThemeColorScheme("dark", "light")).toBe("dark");
  });

  it("exposes the manual override through the app settings", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <SettingsScreen
          dayWindowStartMinutes={720}
          email="parent@example.com"
          profile={{ name: "Luna", dateOfBirth: "2026-02-01" }}
          savingProfile={false}
          profileError={false}
          onSaveDayWindow={vi.fn().mockResolvedValue(undefined)}
          onSaveProfile={vi.fn().mockResolvedValue(undefined)}
          onSignOut={vi.fn().mockResolvedValue(undefined)}
        />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    await waitFor(() => expect(storage.get(THEME_PREFERENCE_KEY)).toBe("dark"));
  });
});
