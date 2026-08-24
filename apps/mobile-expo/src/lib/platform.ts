import { Platform } from "react-native";

export function currentPlatform(): typeof Platform.OS {
  return Platform.OS;
}
