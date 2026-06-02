import { subDays, startOfDay } from "date-fns";
import { getEventsForDateRange } from "@/lib/actions/events";
import { TimelineChart } from "@/components/dashboard/TimelineChart";
import { formatDateTime, eventTypeLabel, diaperTypeLabel } from "@/lib/utils/format";
import type { Event } from "@/lib/db/schema";

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const emoji = { sleep: "😴", feeding: "🍼", diaper: "👶" }[event.type];
  const detail = event.type === "diaper" && event.diaperType
    ? diaperTypeLabel(event.diaperType)
    : event.type === "feeding" && event.feedingType
    ? event.feedingType.replace("_", " ")
    : event.sleepMethod ?? "";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xl w-8 text-center">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 capitalize">{eventTypeLabel(event.type)}</p>
        {detail && <p className="text-xs text-gray-400 capitalize">{detail}</p>}
      </div>
      <span className="text-xs text-gray-400 shrink-0">{formatDateTime(new Date(event.occurredAt))}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const end = new Date();
  const start = startOfDay(subDays(end, 6));
  const events = await getEventsForDateRange(start, end);

  const today = startOfDay(new Date());
  const todayEvents = events.filter((e) => new Date(e.occurredAt) >= today);

  const sleepCount = todayEvents.filter((e) => e.type === "sleep").length;
  const feedingCount = todayEvents.filter((e) => e.type === "feeding").length;
  const diaperCount = todayEvents.filter((e) => e.type === "diaper").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <p className="text-sm text-gray-500">Last 7 days overview below</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sleep sessions" value={sleepCount} emoji="😴" />
        <StatCard label="Feedings" value={feedingCount} emoji="🍼" />
        <StatCard label="Diapers" value={diaperCount} emoji="👶" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">7-day timeline</h2>
        <TimelineChart events={events} days={7} />
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Sleep</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Feeding</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Diaper</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Recent events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No events yet — log your first one!</p>
        ) : (
          <div>
            {events.slice(0, 10).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
