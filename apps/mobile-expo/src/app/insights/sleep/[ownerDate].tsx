import { useLocalSearchParams } from "expo-router";
import { App } from "../../../App";

export default function SleepInsightRoute() {
  const { ownerDate } = useLocalSearchParams<{ ownerDate?: string | string[] }>();
  const selectedOwnerDate = Array.isArray(ownerDate) ? ownerDate[0] : ownerDate;
  return <App initialInsightsOwnerDate={selectedOwnerDate} />;
}
