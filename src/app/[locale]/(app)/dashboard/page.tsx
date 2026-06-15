import { subDays, addDays } from "date-fns";
import { getTranslations } from "next-intl/server";
import { getEventsForDateRange } from "@/lib/actions/events";
import { getDayWindowStartMinutes } from "@/lib/actions/settings";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SleepChartWrapper, FeedingChartWrapper, DiaperChartWrapper } from "@/components/dashboard/EventChartsWrapper";
import { dayWindowBounds, dayWindowDate } from "@/lib/utils/format";

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{emoji}</span>
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function ChartCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 min-w-0 w-full">
      <SectionHeader title={title} emoji={emoji} />
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCharts = await getTranslations("charts");
  const dayWindowStartMinutes = await getDayWindowStartMinutes();

  const now = new Date();
  const currentOwnerDate = dayWindowDate(now, dayWindowStartMinutes);
  const firstOwnerDate = subDays(currentOwnerDate, 8);
  const start = new Date(dayWindowBounds(firstOwnerDate, dayWindowStartMinutes).start.getTime() - 24 * 60 * 60 * 1000);
  const end = dayWindowBounds(addDays(currentOwnerDate, 1), dayWindowStartMinutes).end;
  const events = await getEventsForDateRange(start, end);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>

      <DashboardClient key={dayWindowStartMinutes} events={events} dayWindowStartMinutes={dayWindowStartMinutes} />

      <ChartCard title={tCharts("sleepDuration")} emoji="😴">
        <SleepChartWrapper events={events} dayWindowStartMinutes={dayWindowStartMinutes} />
      </ChartCard>

      <ChartCard title={tCharts("feedingAmounts")} emoji="🍼">
        <FeedingChartWrapper events={events} dayWindowStartMinutes={dayWindowStartMinutes} />
      </ChartCard>

      <ChartCard title={tCharts("diaperChanges")} emoji="👶">
        <DiaperChartWrapper events={events} dayWindowStartMinutes={dayWindowStartMinutes} />
      </ChartCard>
    </div>
  );
}
