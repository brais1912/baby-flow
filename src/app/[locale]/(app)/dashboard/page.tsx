import { subDays, startOfDay } from "date-fns";
import { getTranslations } from "next-intl/server";
import { getEventsForDateRange } from "@/lib/actions/events";
import { DayViewWrapper } from "@/components/dashboard/TimelineChartWrapper";
import { SleepChartWrapper, FeedingChartWrapper, DiaperChartWrapper } from "@/components/dashboard/EventChartsWrapper";

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function ChartCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{emoji} {title}</h2>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCharts = await getTranslations("charts");

  const end = new Date();
  const start = startOfDay(subDays(end, 6));
  const events = await getEventsForDateRange(start, end);

  const today = startOfDay(new Date());
  const todayEvents = events.filter((e) => new Date(e.occurredAt) >= today);

  const sleepingCount = todayEvents.filter((e) => e.type === "sleep" || e.type === "wake_up").length;
  const feedingCount = todayEvents.filter((e) => e.type === "feeding").length;
  const diaperCount = todayEvents.filter((e) => e.type === "diaper").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("sleepingEvents")} value={sleepingCount} emoji="😴" />
        <StatCard label={t("feedings")} value={feedingCount} emoji="🍼" />
        <StatCard label={t("diapers")} value={diaperCount} emoji="👶" />
      </div>

      <DayViewWrapper events={events} />

      <ChartCard title={tCharts("sleepDuration")} emoji="😴">
        <SleepChartWrapper events={events} />
      </ChartCard>

      <ChartCard title={tCharts("feedingAmounts")} emoji="🍼">
        <FeedingChartWrapper events={events} />
      </ChartCard>

      <ChartCard title={tCharts("diaperChanges")} emoji="👶">
        <DiaperChartWrapper events={events} />
      </ChartCard>
    </div>
  );
}
