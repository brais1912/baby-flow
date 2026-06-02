"use client";

import dynamic from "next/dynamic";
import type { Event } from "@/lib/db/schema";

const DayView = dynamic(
  () => import("./DayView").then((m) => m.DayView),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    ),
  }
);

export function DayViewWrapper({ events }: { events: Event[] }) {
  return <DayView events={events} />;
}
