import { describe, it, expect, vi, type ComponentType } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import type { Event } from "@/lib/db/schema";
import { DashboardClient } from "./DashboardClient";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<ComponentType>) => {
    function DynamicMock(props: Record<string, unknown>) {
      const [Comp, setComp] = useState<ComponentType | null>(null);
      useEffect(() => {
        loader().then((comp) => setComp(() => comp));
      }, []);
      return Comp ? <Comp {...props} /> : <div>loading</div>;
    }
    return DynamicMock;
  },
}));

vi.mock("@/components/dashboard/DayView", () => ({
  DayView: ({ events }: { events: Event[] }) => (
    <ul>
      {events.map((e) => (
        <li key={e.id}>{e.type}</li>
      ))}
    </ul>
  ),
}));

vi.mock("@/components/dashboard/EventChartsWrapper", () => ({
  SleepChartWrapper: () => <div>sleep chart</div>,
  FeedingChartWrapper: () => <div>feeding chart</div>,
  DiaperChartWrapper: () => <div>diaper chart</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/lib/actions/events", () => ({
  getEventsForDateRange: vi.fn(),
}));

vi.mock("@/lib/actions/settings", () => ({
  updateDayWindowStartMinutes: vi.fn(),
}));

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    type: "diaper",
    occurredAt: new Date(),
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const rangeStart = new Date("2024-01-01T00:00:00");
const rangeEnd = new Date("2024-02-01T00:00:00");

describe("DashboardClient", () => {
  it("shows events added by a server refresh (QuickLog regression)", async () => {
    const existing = makeEvent({ type: "diaper" });
    const quickLogged = makeEvent({ type: "feeding" });

    const { rerender } = render(
      <DashboardClient
        events={[existing]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    expect(await screen.findByText("diaper")).toBeInTheDocument();
    expect(screen.queryByText("feeding")).not.toBeInTheDocument();

    rerender(
      <DashboardClient
        events={[existing, quickLogged]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    expect(await screen.findByText("feeding")).toBeInTheDocument();
    expect(screen.getByText("diaper")).toBeInTheDocument();
  });
});