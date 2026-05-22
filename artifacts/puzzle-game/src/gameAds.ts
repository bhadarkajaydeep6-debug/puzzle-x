// ================================
// src/gameAds.ts
// Game-level ad integration layer
// Bridges admob.ts with game state
// ================================

import { showBannerAd, showInterstitialAd, showRewardedAd } from "./admob";

// Show banner when the game starts (called from capacitorInit on native)
export function startBannerAd(): void {
  showBannerAd().catch(() => {});
}

// ── Interstitial every 3rd level ───────────────────────────────────────────
// Call this after every level completion on native.
// On web, the React <InterstitialAd /> component handles this via adManager.ts.
export function onLevelComplete(level: number): void {
  if (level % 3 === 0) {
    showInterstitialAd().catch(() => {});
  }
}

// ── Rewarded coins ─────────────────────────────────────────────────────────
// Plays the rewarded ad and then adds 20 coins to localStorage.
// On web, the React <RewardedAd /> component handles UX and coin granting.
// This function is the native shortcut called from gameAds directly.
export async function rewardCoins(): Promise<number> {
  const reward = await showRewardedAd();

  if (reward) {
    const coins = Number(localStorage.getItem("pz_coins") || 0);
    const updated = coins + 20;
    localStorage.setItem("pz_coins", updated.toString());
    return 20; // coins earned
  }

  return 0; // ad dismissed without reward
}
