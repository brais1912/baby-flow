import type { BabyEvent } from "../types/events";
import { DiaperChart, FeedingChart, SleepChart, TimelineChart } from "./DashboardCharts";

export function DashboardCharts({ allEvents, chartEvents, ownerDate, startMinutes, babyName, now }: {
  allEvents: BabyEvent[];
  chartEvents: BabyEvent[];
  ownerDate: Date;
  startMinutes: number;
  babyName: string;
  now: Date;
}) {
  return (
    <>
      <TimelineChart events={allEvents} ownerDate={ownerDate} startMinutes={startMinutes} babyName={babyName} now={now} />
      <SleepChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} babyName={babyName} now={now} />
      <FeedingChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} babyName={babyName} />
      <DiaperChart events={chartEvents} ownerDate={ownerDate} startMinutes={startMinutes} babyName={babyName} />
    </>
  );
}
