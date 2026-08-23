import type { BabyEvent } from "../types/events";
import { DiaperChart, FeedingChart, SleepChart, TimelineChart } from "./DashboardCharts";

export function DashboardCharts({ allEvents, chartEvents, ownerDate, startMinutes, now }: {
  allEvents: BabyEvent[];
  chartEvents: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  now: Date;
}) {
  return (
    <>
      <TimelineChart events={allEvents} ownerDate={ownerDate} startMinutes={startMinutes} now={now} />
      <SleepChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} now={now} />
      <FeedingChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} />
      <DiaperChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} />
    </>
  );
}
