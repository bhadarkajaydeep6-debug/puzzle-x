// ─── Capacitor Initialization ─────────────────────────────────────────────────
// Called once at app startup (before React renders) from main.tsx.
// On the web this is a silent no-op; on Android it boots native plugins.

import { IS_NATIVE } from "@/lib/nativeAdManager";
import { initNativeAds } from "@/lib/nativeAdManager";
import { initOfflineManager } from "@/lib/offlineManager";
import { startBannerAd } from "@/gameAds";

export async function initCapacitor(): Promise<void> {
  // ── Offline detection ──────────────────────────────────────────────────────
  await initOfflineManager();

  if (!IS_NATIVE) return;

  // ── Status bar ────────────────────────────────────────────────────────────
  // Hide the status bar for a full-screen immersive game feel
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0814" });
  } catch {
    // StatusBar may not be available in all environments
  }

  // ── Splash screen ─────────────────────────────────────────────────────────
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch {}

  // ── AdMob ─────────────────────────────────────────────────────────────────
  await initNativeAds();

  // Show banner immediately on game start (native only)
  startBannerAd();

  // ── Back button ───────────────────────────────────────────────────────────
  // Android hardware back button: navigate back in router history.
  // The puzzle game's router (wouter) uses the History API so this works automatically.
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {}

  // ── Haptics ───────────────────────────────────────────────────────────────
  // Expose haptic feedback globally so game components can call it
  // without depending on Capacitor directly.
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    (window as any).__hapticLight = () =>
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    (window as any).__hapticMedium = () =>
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  } catch {}
}

/** Trigger a light haptic tap (safe to call on web — no-op) */
export function hapticLight(): void {
  (window as any).__hapticLight?.();
}

/** Trigger a medium haptic tap (safe to call on web — no-op) */
export function hapticMedium(): void {
  (window as any).__hapticMedium?.();
}
