import { subDays, addDays } from "date-fns";
import { getTranslations } from "next-intl/server";
import { getEventsForDateRange } from "@/lib/actions/events";
import { getDayWindowStartMinutes } from "@/lib/actions/settings";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { dayWindowBounds, dayWindowDate } from "@/lib/utils/format";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const dayWindowStartMinutes = await getDayWindowStartMinutes();

  const now = new Date();
  const currentOwnerDate = dayWindowDate(now, dayWindowStartMinutes);
  const firstOwnerDate = subDays(currentOwnerDate, 18);
  const start = dayWindowBounds(firstOwnerDate, dayWindowStartMinutes).start;
  const end = dayWindowBounds(addDays(currentOwnerDate, 1), dayWindowStartMinutes).end;
  const events = await getEventsForDateRange(start, end);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>

      <DashboardClient
        key={dayWindowStartMinutes}
        events={events}
        dayWindowStartMinutes={dayWindowStartMinutes}
        initialRangeStart={start}
        initialRangeEnd={end}
      />
    </div>
  );
}