import { Network } from "@capacitor/network";
import { useSyncExternalStore } from "react";

let connected = typeof navigator === "undefined" ? true : navigator.onLine;

function subscribe(callback: () => void): () => void {
  const update = (next: boolean) => {
    connected = next;
    callback();
  };
  const online = () => update(true);
  const offline = () => update(false);

  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  const listener = Network.addListener("networkStatusChange", (status) => update(status.connected));
  void Network.getStatus().then((status) => update(status.connected));

  return () => {
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    void listener.then((handle) => handle.remove());
  };
}

function getSnapshot(): boolean {
  return connected;
}

export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
