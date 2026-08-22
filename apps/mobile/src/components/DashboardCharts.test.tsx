import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BabyEvent } from "../types/events";
import { FeedingChart } from "./DashboardCharts";

function feedingEvent(): BabyEvent {
  const occurredAt = new Date(2026, 7, 21, 14);
  return {
    id: "feeding-1",
    userId: "user-1",
    type: "feeding",
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: "breast_left",
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("FeedingChart", () => {
  it("switches between breast-session and bottle metrics", async () => {
    const user = userEvent.setup();
    render(<FeedingChart events={[feedingEvent()]} ownerDate={new Date(2026, 7, 21)} startMinutes={720} />);
    const control = screen.getByRole("group", { name: "Feeding chart metric" });
    const breast = within(control).getByRole("button", { name: "Breast sessions" });
    const bottle = within(control).getByRole("button", { name: "Bottle ml" });

    expect(breast).toHaveClass("active");
    await user.click(bottle);
    expect(bottle).toHaveClass("active");
    expect(breast).not.toHaveClass("active");
  });
});
