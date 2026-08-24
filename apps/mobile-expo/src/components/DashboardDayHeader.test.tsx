import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardDayHeader } from "./DashboardDayHeader";

const selectedDay = new Date(2026, 7, 24);
const bounds = {
  start: new Date(2026, 7, 24, 12),
  end: new Date(2026, 7, 25, 12),
};

describe("DashboardDayHeader", () => {
  it("keeps current-day context compact and prevents future navigation", async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <DashboardDayHeader
        babyName="Alexandra"
        bounds={bounds}
        isToday
        loading={false}
        selectedDay={selectedDay}
        onNext={onNext}
        onPrevious={onPrevious}
        onToday={vi.fn()}
      />
    );

    expect(screen.getByText("Today for Alexandra")).toBeInTheDocument();
    expect(screen.getByText("Mon 24 Aug, 12:00 – Tue 25 Aug, 12:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Return to today" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("preserves historical navigation and Return to today", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onToday = vi.fn();
    render(
      <DashboardDayHeader
        babyName="Alexandra"
        bounds={bounds}
        isToday={false}
        loading={false}
        selectedDay={selectedDay}
        onNext={onNext}
        onPrevious={vi.fn()}
        onToday={onToday}
      />
    );

    expect(screen.getByText("Monday, 24 August 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next day" }));
    await user.click(screen.getByRole("button", { name: "Return to today" }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(onToday).toHaveBeenCalledOnce();
  });
});
