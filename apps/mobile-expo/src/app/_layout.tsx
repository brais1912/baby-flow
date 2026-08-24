import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { I18nProvider } from "../i18n/I18nProvider";
import { initializeNotifications } from "../lib/notificationService";

export default function RootLayout() {
  useEffect(() => initializeNotifications(), []);
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
