// ─── Offline Manager ──────────────────────────────────────────────────────────
// Provides a unified online/offline status for both web (navigator.onLine)
// and native Android (Capacitor Network plugin).
//
// Usage:
//   import { isOnline, onNetworkChange, initOfflineManager } from '@/lib/offlineManager';

import { IS_NATIVE } from "@/lib/nativeAdManager";

type NetworkListener = (online: boolean) => void;

const listeners = new Set<NetworkListener>();
let _online = navigator.onLine;

function emit(online: boolean) {
  if (online === _online) return; // no-op if unchanged
  _online = online;
  listeners.forEach((fn) => fn(online));
}

// ── Web listeners (always active) ─────────────────────────────────────────────
window.addEventListener("online", () => emit(true));
window.addEventListener("offline", () => emit(false));

// ── Native Network plugin (Capacitor) ─────────────────────────────────────────
export async function initOfflineManager(): Promise<void> {
  if (!IS_NATIVE) return;

  const { Network } = await import("@capacitor/network");

  // Get initial status
  const status = await Network.getStatus();
  _online = status.connected;

  // Subscribe to changes
  await Network.addListener("networkStatusChange", (status) => {
    emit(status.connected);
  });
}

/** True if the device currently has a network connection */
export function isOnline(): boolean {
  return _online;
}

/** Subscribe to network change events. Returns an unsubscribe function. */
export function onNetworkChange(fn: NetworkListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
