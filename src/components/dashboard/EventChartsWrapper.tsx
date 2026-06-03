"use client";

import dynamic from "next/dynamic";
import type { Event } from "@/lib/db/schema";

const loading = () => (
  <div className="h-48 flex items-center justify-center text-sm text-gray-400">
    Loading chart...
  </div>
);

const SleepChart = dynamic(() => import("./EventCharts").then((m) => m.SleepChart), { ssr: false, loading });
const FeedingChart = dynamic(() => import("./EventCharts").then((m) => m.FeedingChart), { ssr: false, loading });
const DiaperChart = dynamic(() => import("./EventCharts").then((m) => m.DiaperChart), { ssr: false, loading });

export function SleepChartWrapper({ events }: { events: Event[] }) {
  return <div className="w-full min-w-0 overflow-hidden"><SleepChart events={events} /></div>;
}

export function FeedingChartWrapper({ events }: { events: Event[] }) {
  return <div className="w-full min-w-0 overflow-hidden"><FeedingChart events={events} /></div>;
}

export function DiaperChartWrapper({ events }: { events: Event[] }) {
  return <div className="w-full min-w-0 overflow-hidden"><DiaperChart events={events} /></div>;
}
