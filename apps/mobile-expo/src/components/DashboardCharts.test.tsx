import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { DiaperChart, FeedingChart, SleepChart, TimelineChart } from "./DashboardCharts";

vi.mock("react-native-svg", async () => {
  const native = await import("react-native");
  const Svg = ({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) => (
    <native.View accessibilityLabel={accessibilityLabel}>{children}</native.View>
  );
  const G = ({ children, accessibilityLabel, onPress }: { children: ReactNode; accessibilityLabel?: string; onPress?: () => void }) => onPress ? (
    <native.Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>{children}</native.Pressable>
  ) : <native.View>{children}</native.View>;
  const Shape = () => null;
  const SvgText = ({ children }: { children: ReactNode }) => <native.Text>{children}</native.Text>;
  return {
    default: Svg,
    Circle: Shape,
    G,
    Line: Shape,
    Path: Shape,
    Rect: Shape,
    Text: SvgText,
  };
});

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

const ownerDate = new Date(2026, 7, 24);
const sleep = event("sleep", "sleep", new Date(2026, 7, 24, 21));
const wake = event("wake", "wake_up", new Date(2026, 7, 24, 23));

describe("Dashboard chart details", () => {
  it("describes a sleep-duration bar using the baby's name and readable units", async () => {
    const user = userEvent.setup();
    render(
      <SleepChart
        events={[sleep, wake]}
        ownerDate={ownerDate}
        startMinutes={10 * 60}
        babyName="Luna"
        now={new Date(2026, 7, 25, 10)}
      />
    );

    await user.click(screen.getByLabelText("24 Aug: 2h"));
    expect(screen.getByText("Luna's recorded total sleep was 2 hours for this owner day.")).toBeInTheDocument();
  });

  it("uses the shared natural-language event sheet from the day timeline", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChart
        events={[sleep, wake]}
        ownerDate={ownerDate}
        startMinutes={10 * 60}
        babyName="Luna"
        now={new Date(2026, 7, 25, 10)}
      />
    );

    await user.click(screen.getByLabelText("Sleep at 21:00"));
    expect(screen.getByText("Luna slept for 2 hours, from 21:00 to 23:00.")).toBeInTheDocument();
  });

  it("uses natural singular wording for feeding and diaper chart details", async () => {
    const user = userEvent.setup();
    const feeding = event("feeding", "feeding", new Date(2026, 7, 24, 14), { feedingType: "breast_left" });
    const { unmount } = render(
      <FeedingChart events={[feeding]} ownerDate={ownerDate} startMinutes={10 * 60} babyName="Luna" />
    );

    await user.click(screen.getByLabelText("24 Aug: 1"));
    expect(screen.getByText("Luna had one recorded breastfeeding session on this owner day.")).toBeInTheDocument();
    unmount();

    const diaper = event("diaper", "diaper", new Date(2026, 7, 24, 15), { diaperType: "pee" });
    render(<DiaperChart events={[diaper]} ownerDate={ownerDate} startMinutes={10 * 60} babyName="Luna" />);
    await user.click(screen.getByLabelText("24 Aug: 1"));
    expect(screen.getByText("Luna had one recorded diaper change on this owner day.")).toBeInTheDocument();
  });
});
