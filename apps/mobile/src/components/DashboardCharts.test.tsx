import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { FeedingChart, TimelineChart } from "./DashboardCharts";

function event(id: string, type: EventType, occurredAt: Date, overrides: Partial<BabyEvent> = {}): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

describe("TimelineChart", () => {
  const ownerDate = new Date(2026, 7, 21);
  const events = [
    event("sleep", "sleep", new Date(2026, 7, 21, 13), { sleepMethod: "rocking", notes: "Nap" }),
    event("wake", "wake_up", new Date(2026, 7, 21, 14)),
    event("feed", "feeding", new Date(2026, 7, 21, 15), { feedingType: "bottle", feedingAmountMl: 90 }),
  ];

  it("opens the chart tooltip with localized event details when a marker is selected", async () => {
    const user = userEvent.setup();
    render(<TimelineChart events={events} ownerDate={ownerDate} startMinutes={720} now={new Date(2026, 7, 21, 16)} />);

    await user.click(screen.getByRole("button", { name: "Feeding at 15:00" }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.querySelector(".recharts-default-tooltip")).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("15:00");
    expect(tooltip).toHaveTextContent("Bottle");
    expect(tooltip).toHaveTextContent("90 ml");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a paired sleep range and duration", async () => {
    const user = userEvent.setup();
    render(<TimelineChart events={events} ownerDate={ownerDate} startMinutes={720} now={new Date(2026, 7, 21, 16)} />);

    await user.click(screen.getByRole("button", { name: "Sleep from 13:00 to 14:00" }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("13:00 → 14:00");
    expect(tooltip).toHaveTextContent("1h 0m");
    expect(tooltip).toHaveTextContent("Rocking");
    expect(tooltip).toHaveTextContent("Nap");
  });

  it("closes the timeline tooltip when the selected marker is tapped again", async () => {
    const user = userEvent.setup();
    render(<TimelineChart events={events} ownerDate={ownerDate} startMinutes={720} now={new Date(2026, 7, 21, 16)} />);

    const marker = screen.getByRole("button", { name: "Feeding at 15:00" });
    await user.click(marker);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.click(marker);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("expands to hourly navigation and collapses again", async () => {
    const user = userEvent.setup();
    render(<TimelineChart events={events} ownerDate={ownerDate} startMinutes={720} now={new Date(2026, 7, 21, 16)} />);

    await user.click(screen.getByRole("button", { name: "Expand timeline" }));
    expect(screen.getByRole("button", { name: "Collapse timeline" })).toBeInTheDocument();
    expect(screen.getByLabelText("Expanded timeline")).toBeInTheDocument();
    expect(screen.getByText("13:00", { selector: ".timeline-hour" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse timeline" }));
    expect(screen.getByRole("button", { name: "Expand timeline" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Expanded timeline")).not.toBeInTheDocument();
  });
});

describe("FeedingChart", () => {
  it("switches between breast-session and bottle metrics", async () => {
    const user = userEvent.setup();
    const feeding = event("feeding-1", "feeding", new Date(2026, 7, 21, 14), { feedingType: "breast_left" });
    render(<FeedingChart events={[feeding]} ownerDate={new Date(2026, 7, 21)} startMinutes={720} />);
    const control = screen.getByRole("group", { name: "Feeding chart metric" });
    const breast = within(control).getByRole("button", { name: "Breast sessions" });
    const bottle = within(control).getByRole("button", { name: "Bottle ml" });

    expect(breast).toHaveClass("active");
    await user.click(bottle);
    expect(bottle).toHaveClass("active");
    expect(breast).not.toHaveClass("active");
  });
});
