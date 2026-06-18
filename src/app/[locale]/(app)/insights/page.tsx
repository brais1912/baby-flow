import { getTranslations } from "next-intl/server";
import { startOfWeekMonday, weeklyInsightsFetchRange } from "@/lib/utils/format";
import { getEventsForDateRange } from "@/lib/actions/events";
import { getDayWindowStartMinutes } from "@/lib/actions/settings";
import { InsightsClient } from "@/components/insights/InsightsClient";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const t = await getTranslations("insights");
  const { week } = await searchParams;
  const dayWindowStartMinutes = await getDayWindowStartMinutes();

  const weekStart = week ? new Date(week) : startOfWeekMonday(new Date());
  const { start: fetchStart, end: fetchEnd } = weeklyInsightsFetchRange(weekStart);

  const events = await getEventsForDateRange(fetchStart, fetchEnd);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>
      <InsightsClient events={events} weekStart={weekStart.toISOString()} dayWindowStartMinutes={dayWindowStartMinutes} />
    </div>
  );
}
