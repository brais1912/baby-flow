import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import {
  sleepSummaryOwnerDateFromResponse,
  sleepSummaryOwnerDateFromUrl,
} from "../lib/sleepNotificationService";

export function useSleepSummaryNotificationNavigation(onOpenOwnerDate: (ownerDate: Date) => void): void {
  useEffect(() => {
    const openResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const ownerDate = sleepSummaryOwnerDateFromResponse(response);
      if (ownerDate) onOpenOwnerDate(ownerDate);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    const openUrl = (url: string | null) => {
      const ownerDate = sleepSummaryOwnerDateFromUrl(url);
      if (ownerDate) onOpenOwnerDate(ownerDate);
    };
    const linkSubscription = Linking.addEventListener("url", ({ url }) => openUrl(url));
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        openResponse(response);
        if (response) return Notifications.clearLastNotificationResponseAsync();
        return undefined;
      })
      .catch(() => undefined);
    void Linking.getInitialURL().then(openUrl).catch(() => undefined);
    return () => {
      subscription.remove();
      linkSubscription.remove();
    };
  }, [onOpenOwnerDate]);
}
