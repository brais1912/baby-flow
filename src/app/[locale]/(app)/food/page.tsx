import { getTranslations } from "next-intl/server";
import { getFoodEntries } from "@/lib/actions/foods";
import { FoodLogClient } from "@/components/food/FoodLogClient";

export default async function FoodPage() {
  const t = await getTranslations("food");
  const entries = await getFoodEntries();

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>
      <FoodLogClient entries={entries} />
    </div>
  );
}