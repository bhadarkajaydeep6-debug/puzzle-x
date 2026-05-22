// ─── Ad Manager ─────────────────────────────────────────────────────────────
// Tracks ad state and timing for the web puzzle game.
//
// Web equivalent of Unity's AdMob AdManager:
//   Banner      → <BannerAd />  component (ready for Google AdSense slot)
//   Interstitial → <InterstitialAd /> shown every N level completions
//   Rewarded    → <RewardedAd />  user opts in for coins
//
// To wire in real Google AdSense:
//   1. Add your AdSense script to index.html
//   2. Replace the placeholder div in BannerAd.tsx with:
//      <ins class="adsbygoogle" data-ad-client="ca-pub-XXXXX" data-ad-slot="YYYYY" />
//   3. Call (window as any).adsbygoogle?.push({}) after mount
//
// All ad state is tracked in localStorage so it persists across sessions.

const INTERSTITIAL_EVERY_N_LEVELS = 3; // Show interstitial after every 3rd level win
const KEYS = {
  levelsCompletedSinceAd: "ad_lvls_since_interstitial",
  totalAdsWatched: "ad_total_watched",
  totalRewardsEarned: "ad_rewards_earned",
};

// ── Interstitial tracking ────────────────────────────────────────────────────

/** Call this after every level completion. Returns true if an interstitial should be shown. */
export function recordLevelComplete(): boolean {
  const raw = localStorage.getItem(KEYS.levelsCompletedSinceAd);
  const count = raw ? parseInt(raw, 10) : 0;
  const next = count + 1;

  if (next >= INTERSTITIAL_EVERY_N_LEVELS) {
    // Reset counter — interstitial will fire
    localStorage.setItem(KEYS.levelsCompletedSinceAd, "0");
    return true;
  }

  localStorage.setItem(KEYS.levelsCompletedSinceAd, String(next));
  return false;
}

/** Mark that the interstitial was shown (call after it closes) */
export function recordInterstitialShown(): void {
  const raw = localStorage.getItem(KEYS.totalAdsWatched);
  const count = raw ? parseInt(raw, 10) : 0;
  localStorage.setItem(KEYS.totalAdsWatched, String(count + 1));
}

// ── Rewarded ad tracking ─────────────────────────────────────────────────────

/** How many coins the player gets per rewarded ad */
export const REWARDED_AD_COINS = 20;

/** How long the rewarded ad plays before granting the reward (seconds) */
export const REWARDED_AD_DURATION = 15;

/** How long the interstitial shows before the skip button appears (seconds) */
export const INTERSTITIAL_SKIP_DELAY = 5;

/** Record a completed rewarded ad view */
export function recordRewardedAdWatched(): void {
  const raw = localStorage.getItem(KEYS.totalRewardsEarned);
  const count = raw ? parseInt(raw, 10) : 0;
  localStorage.setItem(KEYS.totalRewardsEarned, String(count + 1));
}

/** Total rewarded ads the player has ever watched */
export function getTotalRewardsWatched(): number {
  const raw = localStorage.getItem(KEYS.totalRewardsEarned);
  return raw ? parseInt(raw, 10) : 0;
}
