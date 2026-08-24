import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventInput } from "../types/events";
import { DashboardScreen } from "./DashboardScreen";

vi.mock("../hooks/useNetworkStatus", () => ({ useNetworkStatus: () => true }));
vi.mock("./DashboardChartsGroup", () => ({
  DashboardCharts: () => <Text>Charts marker</Text>,
}));
vi.mock("./EventSheet", () => ({
  EventSheet: () => <Text>Detailed event sheet</Text>,
}));

function babyEvent(input: EventInput): BabyEvent {
  const occurredAt = input.occurredAt;
  return {
    id: "event-1",
    userId: "user-1",
    type: input.type,
    occurredAt,
    notes: input.notes ?? null,
    sleepMethod: input.sleepMethod ?? null,
    sleepCondition: input.sleepCondition ?? null,
    sleepRoomTemperature: input.sleepRoomTemperature ?? null,
    feedingType: input.feedingType ?? null,
    feedingAmountMl: input.feedingAmountMl ?? null,
    feedingDurationMinutes: input.feedingDurationMinutes ?? null,
    diaperType: input.diaperType ?? null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

const data = {
  events: [],
  loading: false,
  mutating: false,
  error: null,
  sleepPhase: null,
  sleepPhaseReady: true,
  insightsRevision: 0,
  dayEvents: [],
  selectedDay: new Date(2026, 7, 24),
  dayWindowStartMinutes: 10 * 60,
  isToday: true,
  reload: vi.fn().mockResolvedValue(undefined),
  refreshToday: vi.fn().mockResolvedValue(undefined),
  selectAdjacentDay: vi.fn().mockResolvedValue(undefined),
  goToToday: vi.fn().mockResolvedValue(undefined),
  saveDayWindowStart: vi.fn().mockResolvedValue(undefined),
  create: vi.fn(async (input: EventInput) => babyEvent(input)),
  updateTime: vi.fn(async (event: BabyEvent, occurredAt: Date) => ({ ...event, occurredAt })),
  remove: vi.fn().mockResolvedValue(undefined),
};

describe("DashboardScreen hierarchy", () => {
  it("keeps one Events heading, moves detailed creation beside Quick Log, and puts compact totals last", async () => {
    const user = userEvent.setup();
    render(<DashboardScreen data={data} babyName="Luna" />);

    expect(screen.getAllByText("Events")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New detailed event" }));
    expect(screen.getByText("Detailed event sheet")).toBeInTheDocument();

    const charts = screen.getByText("Charts marker");
    const totals = screen.getByText("Day totals");
    expect(charts.compareDocumentPosition(totals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Sleep events: 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Night wakings: 0")).toBeInTheDocument();
  });

  it("opens a natural-language detail sheet from an event row", async () => {
    const user = userEvent.setup();
    const wake = babyEvent({ type: "wake_up", occurredAt: new Date(2026, 7, 24, 10) });
    const sleep = {
      ...babyEvent({ type: "sleep", occurredAt: new Date(2026, 7, 24, 11, 30) }),
      id: "sleep-1",
    };
    render(
      <DashboardScreen
        data={{ ...data, events: [wake, sleep], dayEvents: [sleep] }}
        babyName="Luna"
      />
    );

    await user.click(screen.getByRole("button", { name: "Open Sleep details at 11:30" }));
    expect(screen.getByText("Luna was awake for 1 hour 30 minutes before falling asleep at 11:30.")).toBeInTheDocument();
  });
});
