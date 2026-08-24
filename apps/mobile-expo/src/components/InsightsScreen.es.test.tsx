import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { es } from "date-fns/locale";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { translate } from "../i18n/messages";
import type { DailySleepSummary } from "../lib/sleepInsights";
import { InsightsScreen } from "./InsightsScreen";

vi.mock("../i18n/I18nProvider", () => ({
  useI18n: () => ({
    locale: "es",
    dateLocale: es,
    setLocale: vi.fn(),
    t: (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate("es", key, values),
  }),
}));

function summary(ownerDate: Date): DailySleepSummary {
  return {
    ownerDate,
    windowStart: new Date(2026, 7, 23, 12),
    windowEnd: new Date(2026, 7, 24, 12),
    totalSleepMinutes: 720,
    daytimeSleepMinutes: 60,
    nighttimeSleepMinutes: 660,
    daytimeSessionCount: 1,
    nighttimeSessionCount: 2,
    daytimeAverageMinutes: 60,
    nighttimeAverageMinutes: 240,
    nightWakings: 1,
    longestSleepMinutes: 300,
    completePairCount: 3,
    excludedUnmatchedCount: 0,
    ageMonthsAtWindowEnd: 6,
    references: [],
  };
}

function Harness() {
  const [selected, setSelected] = useState<Date | null>(null);
  return (
    <InsightsScreen
      data={{
        summaries: [
          summary(new Date(2026, 7, 24)),
          summary(new Date(2026, 7, 23)),
        ],
        events: [],
        latestOwnerDate: new Date(2026, 7, 24),
        startMinutes: 720,
        loading: false,
        error: false,
        reload: vi.fn().mockResolvedValue(undefined),
      }}
      profile={{ name: "Luna", dateOfBirth: "2026-02-24" }}
      selectedOwnerDate={selected}
      onSelectOwnerDate={setSelected}
    />
  );
}

describe("InsightsScreen Spanish navigation", () => {
  it("opens and closes a localized owner-day detail", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir resumen de sueño del domingo, 23 agosto" }));
    expect(screen.getByText("domingo, 23 agosto 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Volver a hoy" }));
    expect(screen.getByText("lunes, 24 agosto 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Volver al historial" }));
    expect(screen.getByText("Análisis del sueño")).toBeInTheDocument();
  });
});
