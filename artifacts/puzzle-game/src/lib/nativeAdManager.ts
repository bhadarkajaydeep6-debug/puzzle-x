// ─── Native Ad Manager ────────────────────────────────────────────────────────
// Wraps @capacitor-community/admob (v8) so the rest of the app calls one
// unified interface that works both:
//   • On a real Android device  → real AdMob ads via the Capacitor plugin
//   • In a browser / Replit dev → no-op (web simulation components handle UI)
//
// AD IDs:
//   The constants below use Google's official TEST IDs.
//   Replace them with your real ca-app-pub-XXXXX/YYYYY IDs before publishing.
//   Set VITE_ADMOB_* env vars in a .env.production file to override.
//
// Usage:
//   import { initNativeAds, showNativeBanner, ... } from '@/lib/nativeAdManager';

import { Capacitor } from "@capacitor/core";
import type { BannerAdOptions, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob";

// ── Is this running as a real native Android app? ─────────────────────────────
export const IS_NATIVE = Capacitor.isNativePlatform();

// ── AdMob test IDs (Google-published, safe to commit) ────────────────────────
const TEST_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
};

// ── Production IDs — override via .env.production ────────────────────────────
const PROD_IDS = {
  banner: import.meta.env.VITE_ADMOB_BANNER_ID ?? TEST_IDS.banner,
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID ?? TEST_IDS.interstitial,
  rewarded: import.meta.env.VITE_ADMOB_REWARDED_ID ?? TEST_IDS.rewarded,
};

// Use test IDs in dev, prod IDs in production builds
const AD_IDS = import.meta.env.PROD ? PROD_IDS : TEST_IDS;

// ── Lazy-load the AdMob plugin only on native ─────────────────────────────────
// Dynamic import prevents bundlers from failing on web where the plugin's
// native layer is absent.
async function getAdMob() {
  if (!IS_NATIVE) return null;
  const { AdMob } = await import("@capacitor-community/admob");
  return AdMob;
}

// ── Initialization ────────────────────────────────────────────────────────────
// Call once at app startup (via initCapacitor() in main.tsx).
export async function initNativeAds(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;

  await AdMob.initialize({
    // Register test devices so real devices show test ads during development
    testingDevices: [],
    initializeForTesting: import.meta.env.DEV,
  });

  // Request ATT permission on iOS (Android doesn't need this, but the call
  // is harmless and is required for iOS builds).
  AdMob.requestTrackingAuthorization?.().catch(() => {});
}

// ── Banner Ad ─────────────────────────────────────────────────────────────────
// Renders a native AdMob BannerView anchored at the bottom of the screen.
export async function showNativeBanner(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;

  const options: BannerAdOptions = {
    adId: AD_IDS.banner,
    adSize: "BANNER" as BannerAdSize,
    position: "BOTTOM_CENTER" as BannerAdPosition,
    margin: 0,
    isTesting: import.meta.env.DEV,
  };
  await AdMob.showBanner(options);
}

export async function hideNativeBanner(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  await AdMob.hideBanner();
}

export async function removeNativeBanner(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  await AdMob.removeBanner();
}

// ── Interstitial Ad ───────────────────────────────────────────────────────────
// Must call prepareNativeInterstitial() first, then showNativeInterstitial()
// when you want the ad to appear.
export async function prepareNativeInterstitial(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  await AdMob.prepareInterstitial({
    adId: AD_IDS.interstitial,
    isTesting: import.meta.env.DEV,
  });
}

export async function showNativeInterstitial(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  await AdMob.showInterstitial();
  // Pre-load the next interstitial immediately in the background
  prepareNativeInterstitial().catch(() => {});
}

// ── Rewarded Ad ───────────────────────────────────────────────────────────────
// In AdMob v8, showRewardVideoAd() returns Promise<AdMobRewardItem> directly —
// no event listeners needed. The promise resolves with the reward on success and
// rejects if the ad was dismissed without completion.

export interface RewardResult {
  type: string;
  amount: number;
}

export async function prepareNativeRewarded(): Promise<void> {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  await AdMob.prepareRewardVideoAd({
    adId: AD_IDS.rewarded,
    isTesting: import.meta.env.DEV,
  });
}

export async function showNativeRewarded(): Promise<RewardResult | null> {
  const AdMob = await getAdMob();
  if (!AdMob) return null;

  try {
    // v8: showRewardVideoAd resolves with the reward item when the user earns it
    const reward = await AdMob.showRewardVideoAd();
    // Pre-load next rewarded ad in background so it's ready when the player
    // clicks "Watch Ad" again
    setTimeout(() => prepareNativeRewarded().catch(() => {}), 3000);
    return { type: reward.type, amount: reward.amount };
  } catch {
    // Ad dismissed before reward was earned, or load failed
    return null;
  }
}
