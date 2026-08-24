import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DailySleepSummary } from "../lib/sleepInsights";
import { InsightsScreen } from "./InsightsScreen";

function summary(ownerDate: Date, totalSleepMinutes: number): DailySleepSummary {
  const windowStart = new Date(ownerDate);
  windowStart.setHours(12);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);
  return {
    ownerDate,
    windowStart,
    windowEnd,
    totalSleepMinutes,
    daytimeSleepMinutes: 60,
    nighttimeSleepMinutes: totalSleepMinutes - 60,
    daytimeSessionCount: 1,
    nighttimeSessionCount: 2,
    daytimeAverageMinutes: 60,
    nighttimeAverageMinutes: 240,
    nightWakings: 1,
    longestSleepMinutes: 300,
    completePairCount: 3,
    excludedUnmatchedCount: 1,
    ageMonthsAtWindowEnd: 6,
    references: [],
  };
}

const data = {
  summaries: [
    summary(new Date(2026, 7, 24), 780),
    summary(new Date(2026, 7, 23), 720),
  ],
  events: [],
  latestOwnerDate: new Date(2026, 7, 24),
  startMinutes: 720,
  loading: false,
  error: false,
  reload: vi.fn().mockResolvedValue(undefined),
};

function Harness() {
  const [selected, setSelected] = useState<Date | null>(null);
  return (
    <InsightsScreen
      data={data}
      profile={{ name: "Luna", dateOfBirth: "2026-02-24" }}
      selectedOwnerDate={selected}
      onSelectOwnerDate={setSelected}
    />
  );
}

describe("InsightsScreen", () => {
  it("opens a historical detail and returns to the latest owner day", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open sleep summary for Sunday, 23 August" }));
    expect(screen.getByText("Sunday, 23 August 2026")).toBeInTheDocument();
    expect(screen.getByText("12h")).toBeInTheDocument();
    expect(screen.getByText("3 complete sleep→wake pairs included · 1 unmatched events excluded")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Return to today" }));
    expect(screen.getByText("Monday, 24 August 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next summary day" })).toBeDisabled();
  });

  it("shows an explicit empty history state", () => {
    const emptySummary = {
      ...summary(new Date(2026, 7, 24), 0),
      completePairCount: 0,
      excludedUnmatchedCount: 0,
    };
    render(
      <InsightsScreen
        data={{ ...data, summaries: [emptySummary] }}
        profile={{ name: "Luna", dateOfBirth: "2026-02-24" }}
        selectedOwnerDate={null}
        onSelectOwnerDate={vi.fn()}
      />
    );
    expect(screen.getByText("No completed sleep sessions are recorded in this history yet.")).toBeInTheDocument();
  });
});
