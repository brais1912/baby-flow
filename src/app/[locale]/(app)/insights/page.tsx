import { getTranslations } from "next-intl/server";
import { startOfWeekMonday, endOfWeekSunday } from "@/lib/utils/format";
import { getEventsForDateRange } from "@/lib/actions/events";
import { InsightsClient } from "@/components/insights/InsightsClient";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const t = await getTranslations("insights");
  const { week } = await searchParams;

  const weekStart = week ? new Date(week) : startOfWeekMonday(new Date());
  const weekEnd = endOfWeekSunday(weekStart);

  // Fetch one extra day on each side so sleep sessions that cross midnight are included
  const fetchStart = new Date(weekStart); fetchStart.setDate(fetchStart.getDate() - 1);
  const fetchEnd   = new Date(weekEnd);   fetchEnd.setDate(fetchEnd.getDate() + 1);

  const events = await getEventsForDateRange(fetchStart, fetchEnd);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>
      <InsightsClient events={events} weekStart={weekStart.toISOString()} />
    </div>
  );
}
