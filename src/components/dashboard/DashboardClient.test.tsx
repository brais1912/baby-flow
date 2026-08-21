import { describe, it, expect, vi, type ComponentType } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import type { Event } from "@/lib/db/schema";
import { DashboardClient } from "./DashboardClient";
import { getEventsForDateRange } from "@/lib/actions/events";

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
  DayView: ({ events, onDayChange, onEventUpdated, onEventDeleted }: {
    events: Event[];
    onDayChange?: (day: Date) => void;
    onEventUpdated?: (event: Event) => void;
    onEventDeleted?: (eventId: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onDayChange?.(new Date("2024-03-15T12:00:00"))}>
        nav-next
      </button>
      <button
        type="button"
        onClick={() => events[0] && onEventUpdated?.({
          ...events[0],
          occurredAt: new Date("2024-03-15T10:00:00"),
          updatedAt: new Date(Date.now() + 1_000),
        })}
      >
        edit-local
      </button>
      <button type="button" onClick={() => events[0] && onEventDeleted?.(events[0].id)}>
        delete-local
      </button>
      <ul>
        {events.map((e) => {
          const d = new Date(e.occurredAt);
          const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          return (
            <li key={e.id}>
              <span>{e.type}</span> <time>{time}</time>
            </li>
          );
        })}
      </ul>
    </div>
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

  it("prefers refreshed server data over stale client-fetched events after an edit", async () => {
    const stale = makeEvent({ id: "evt-1", type: "feeding", occurredAt: new Date("2024-03-15T09:00:00") });
    const edited = { ...stale, occurredAt: new Date("2024-03-15T10:00:00") };
    vi.mocked(getEventsForDateRange).mockResolvedValue([stale]);

    const { rerender } = render(
      <DashboardClient
        events={[]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    await userEvent.click(await screen.findByText("nav-next"));
    expect(await screen.findByText("09:00", { selector: "time" })).toBeInTheDocument();

    rerender(
      <DashboardClient
        events={[edited]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    expect(await screen.findByText("10:00", { selector: "time" })).toBeInTheDocument();
    expect(screen.queryByText("09:00", { selector: "time" })).not.toBeInTheDocument();
  });

  it("updates a client-fetched historical event immediately after editing", async () => {
    const stale = makeEvent({ id: "evt-old", type: "feeding", occurredAt: new Date("2024-03-15T09:00:00") });
    vi.mocked(getEventsForDateRange).mockResolvedValue([stale]);

    render(
      <DashboardClient
        events={[]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    await userEvent.click(await screen.findByText("nav-next"));
    expect(await screen.findByText("09:00", { selector: "time" })).toBeInTheDocument();

    await userEvent.click(screen.getByText("edit-local"));

    expect(await screen.findByText("10:00", { selector: "time" })).toBeInTheDocument();
    expect(screen.queryByText("09:00", { selector: "time" })).not.toBeInTheDocument();
  });

  it("keeps a local edit when a refreshed server payload is stale", async () => {
    const stale = makeEvent({ id: "evt-stale", type: "feeding", occurredAt: new Date("2024-03-15T09:00:00") });
    const { rerender } = render(
      <DashboardClient
        events={[stale]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    await userEvent.click(await screen.findByText("edit-local"));
    expect(await screen.findByText("10:00", { selector: "time" })).toBeInTheDocument();

    rerender(
      <DashboardClient
        events={[{ ...stale }]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    expect(screen.getByText("10:00", { selector: "time" })).toBeInTheDocument();
    expect(screen.queryByText("09:00", { selector: "time" })).not.toBeInTheDocument();
  });

  it("does not restore a deleted event from stale fetched or server data", async () => {
    const stale = makeEvent({ id: "evt-deleted", type: "feeding", occurredAt: new Date("2024-03-15T09:00:00") });
    vi.mocked(getEventsForDateRange).mockResolvedValue([stale]);
    const { rerender } = render(
      <DashboardClient
        events={[]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    await userEvent.click(await screen.findByText("nav-next"));
    expect(await screen.findByText("09:00", { selector: "time" })).toBeInTheDocument();

    await userEvent.click(screen.getByText("delete-local"));
    expect(screen.queryByText("09:00", { selector: "time" })).not.toBeInTheDocument();

    rerender(
      <DashboardClient
        events={[stale]}
        dayWindowStartMinutes={12 * 60}
        initialRangeStart={rangeStart}
        initialRangeEnd={rangeEnd}
      />
    );

    expect(screen.queryByText("09:00", { selector: "time" })).not.toBeInTheDocument();
  });
});
