import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BabyEvent, EventType } from "../types/events";
import { useEvents } from "../hooks/useEvents";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { DashboardScreen } from "./DashboardScreen";
import { I18nProvider, LANGUAGE_PREFERENCE_KEY } from "../i18n/I18nProvider";

const preferences = vi.hoisted(() => ({ values: new Map<string, string>() }));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: preferences.values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => preferences.values.set(key, value)),
    remove: vi.fn(async ({ key }: { key: string }) => preferences.values.delete(key)),
  },
}));

vi.mock("../hooks/useEvents");
vi.mock("../hooks/useNetworkStatus");
vi.mock("./DashboardCharts", () => ({
  TimelineChart: () => <div>Day timeline</div>,
  SleepChart: () => <div>Sleep chart</div>,
  FeedingChart: () => <div>Feeding chart</div>,
  DiaperChart: () => <div>Diaper chart</div>,
}));

function event(id: string, type: EventType, occurredAt: Date): BabyEvent {
  return {
    id,
    userId: "user-1",
    type,
    occurredAt,
    notes: null,
    sleepMethod: null,
    sleepCondition: null,
    sleepRoomTemperature: null,
    feedingType: type === "feeding" ? "breast_left" : null,
    feedingAmountMl: null,
    feedingDurationMinutes: null,
    diaperType: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

describe("DashboardScreen", () => {
  const selectedDay = new Date(2026, 7, 21);
  const events = [
    event("sleep", "sleep", new Date(2026, 7, 21, 14)),
    event("feeding", "feeding", new Date(2026, 7, 21, 13)),
  ];
  let data: ReturnType<typeof useEvents>;

  beforeEach(() => {
    preferences.values.clear();
    vi.mocked(useNetworkStatus).mockReturnValue(true);
    data = {
      events,
      dayEvents: events,
      sleepPhase: events[0],
      sleepPhaseReady: true,
      loading: false,
      mutating: false,
      error: null,
      selectedDay,
      dayWindowStartMinutes: 720,
      isToday: false,
      reload: vi.fn().mockResolvedValue(undefined),
      selectAdjacentDay: vi.fn().mockResolvedValue(undefined),
      goToToday: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(events[0]),
      updateTime: vi.fn().mockResolvedValue(events[0]),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(useEvents).mockReturnValue(data);
  });

  it("renders the event list before the timeline and filters it", async () => {
    const user = userEvent.setup();
    render(<DashboardScreen data={data} babyName="Leo" />);

    const eventsHeading = screen.getByRole("heading", { name: "Events" });
    const timeline = screen.getByText("Day timeline");
    expect(eventsHeading.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    const filters = screen.getByRole("group", { name: "Filter events" });
    await user.click(within(filters).getByRole("button", { name: "Sleep" }));

    expect(screen.getByText("Sleep", { selector: ".event-title-row strong" })).toBeInTheDocument();
    expect(screen.queryByText("Feeding", { selector: ".event-title-row strong" })).not.toBeInTheDocument();
  });

  it("renders an authenticated dashboard surface in Spanish", async () => {
    preferences.values.set(LANGUAGE_PREFERENCE_KEY, "es");
    render(<I18nProvider><DashboardScreen data={data} babyName="Leo" /></I18nProvider>);
    expect(await screen.findByRole("heading", { name: "Eventos" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Filtrar eventos" })).toBeInTheDocument();
    expect(screen.getByText("Dormir", { selector: ".event-title-row strong" })).toBeInTheDocument();
  });
});
