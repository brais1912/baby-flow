import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.babyflow.app",
  appName: "BabyFlow",
  webDir: "dist",
  loggingBehavior: "none",
  server: {
    androidScheme: "https",
  },
  plugins: {
    LocalNotifications: {
      iconColor: "#7c3aed",
      presentationOptions: ["banner", "sound"],
    },
  },
};

export default config;
