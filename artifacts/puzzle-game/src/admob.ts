// ================================
// src/admob.ts
// Capacitor AdMob wrapper
// Works on Android (real ads) and browser (no-ops)
// ================================

import { Capacitor } from "@capacitor/core";

const IS_NATIVE = Capacitor.isNativePlatform();

// ── Test IDs (Google-published — safe for dev/testing) ─────────────────────
export const AD_IDS = {
  banner:       "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded:     "ca-app-pub-3940256099942544/5224354917",
};

// Lazy-load the plugin so the web bundle doesn't break when the
// native layer isn't present in a browser environment.
async function admob() {
  if (!IS_NATIVE) return null;
  const { AdMob } = await import("@capacitor-community/admob");
  return AdMob;
}

// ── Initialize ─────────────────────────────────────────────────────────────
export async function initializeAds(): Promise<void> {
  const AdMob = await admob();
  if (!AdMob) return;

  await AdMob.initialize({
    testingDevices: [],
    initializeForTesting: true, // set false for production release
  });

  console.log("AdMob Initialized");
}

// ── Banner Ad ──────────────────────────────────────────────────────────────
export async function showBannerAd(): Promise<void> {
  const AdMob = await admob();
  if (!AdMob) return;

  await AdMob.showBanner({
    adId: AD_IDS.banner,
    adSize: "BANNER" as import("@capacitor-community/admob").BannerAdSize,
    position: "BOTTOM_CENTER" as import("@capacitor-community/admob").BannerAdPosition,
    margin: 0,
    isTesting: true,
  });
}

export async function hideBannerAd(): Promise<void> {
  const AdMob = await admob();
  if (!AdMob) return;
  await AdMob.hideBanner();
}

export async function removeBannerAd(): Promise<void> {
  const AdMob = await admob();
  if (!AdMob) return;
  await AdMob.removeBanner();
}

// ── Interstitial Ad ────────────────────────────────────────────────────────
export async function showInterstitialAd(): Promise<void> {
  const AdMob = await admob();
  if (!AdMob) return;

  await AdMob.prepareInterstitial({
    adId: AD_IDS.interstitial,
    isTesting: true,
  });

  await AdMob.showInterstitial();
}

// ── Rewarded Ad ────────────────────────────────────────────────────────────
// Returns the reward item ({ type, amount }) when the player earns it,
// or null if the ad was dismissed without completing.
export async function showRewardedAd(): Promise<{ type: string; amount: number } | null> {
  const AdMob = await admob();
  if (!AdMob) return null;

  await AdMob.prepareRewardVideoAd({
    adId: AD_IDS.rewarded,
    isTesting: true,
  });

  try {
    const reward = await AdMob.showRewardVideoAd();
    return { type: reward.type, amount: reward.amount };
  } catch {
    return null;
  }
}
