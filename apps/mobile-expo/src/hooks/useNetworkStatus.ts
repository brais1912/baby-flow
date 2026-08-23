import { useNetworkState } from "expo-network";

export function useNetworkStatus(): boolean {
  const state = useNetworkState();
  return state.isConnected !== false && state.isInternetReachable !== false;
}
