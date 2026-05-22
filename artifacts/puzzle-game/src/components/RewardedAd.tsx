// ─── RewardedAd ───────────────────────────────────────────────────────────────
// Unified rewarded ad component.
//
// • On Android (native)  → delegates to AdMob showNativeRewarded().
//                          The native full-screen ad handles its own UI.
//                          This component shows only the opt-in confirm dialog,
//                          then fires the native ad, then calls onRewarded().
//
// • In browser / web     → renders the full simulated ad with a countdown timer.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gift, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REWARDED_AD_COINS, REWARDED_AD_DURATION, recordRewardedAdWatched } from "@/lib/adManager";
import { IS_NATIVE, showNativeRewarded, prepareNativeRewarded } from "@/lib/nativeAdManager";

interface RewardedAdProps {
  isOpen: boolean;
  onRewarded: (coins: number) => void;
  onDismiss: () => void;
}

type Phase = "confirm" | "loading" | "playing" | "complete";

export function RewardedAd({ isOpen, onRewarded, onDismiss }: RewardedAdProps) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [timeLeft, setTimeLeft] = useState(REWARDED_AD_DURATION);

  // Reset on open and pre-load native ad
  useEffect(() => {
    if (isOpen) {
      setPhase("confirm");
      setTimeLeft(REWARDED_AD_DURATION);
      if (IS_NATIVE) prepareNativeRewarded().catch(() => {});
    }
  }, [isOpen]);

  // Web countdown during "playing" phase
  useEffect(() => {
    if (phase !== "playing" || IS_NATIVE) return;
    if (timeLeft <= 0) { setPhase("complete"); return; }
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // ── Native: show the real AdMob rewarded ad after opt-in ─────────────────
  const handleNativeStart = useCallback(async () => {
    setPhase("loading");
    try {
      const result = await showNativeRewarded();
      if (result) {
        recordRewardedAdWatched();
        onRewarded(REWARDED_AD_COINS);
      } else {
        // Player dismissed without earning
        onDismiss();
      }
    } catch {
      onDismiss();
    }
  }, [onRewarded, onDismiss]);

  // ── Web: start simulated ad ───────────────────────────────────────────────
  const handleWebStart = useCallback(() => {
    setPhase("playing");
    setTimeLeft(REWARDED_AD_DURATION);
  }, []);

  const handleStart = IS_NATIVE ? handleNativeStart : handleWebStart;

  const handleClaimReward = useCallback(() => {
    recordRewardedAdWatched();
    onRewarded(REWARDED_AD_COINS);
  }, [onRewarded]);

  const progress = 1 - timeLeft / REWARDED_AD_DURATION;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          data-testid="rewarded-ad"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card w-full max-w-sm rounded-3xl overflow-hidden border border-border shadow-2xl"
          >
            {/* ── Confirm: opt-in dialog (both web and native) ── */}
            {(phase === "confirm" || phase === "loading") && (
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mb-5">
                  {phase === "loading" ? (
                    <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                  ) : (
                    <Gift className="w-10 h-10 text-yellow-400" />
                  )}
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Watch & Earn</h2>
                <p className="text-muted-foreground mb-1">Watch a short ad to earn</p>
                <div className="flex items-center gap-1.5 text-yellow-400 font-black text-2xl mb-8">
                  <Coins className="w-6 h-6" />
                  <span>+{REWARDED_AD_COINS} Coins</span>
                </div>

                <div className="w-full bg-background rounded-2xl border border-border p-4 mb-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xl font-black text-primary">🧩</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Puzzle Universe</p>
                    <p className="text-xs text-muted-foreground">Thousands of challenging levels</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wide">
                      Advertisement · {REWARDED_AD_DURATION}s
                    </p>
                  </div>
                </div>

                <div className="w-full flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onDismiss}
                    disabled={phase === "loading"}
                    className="flex-1 h-12 rounded-xl border-border text-muted-foreground"
                    data-testid="button-rewarded-cancel"
                  >
                    <X className="w-4 h-4 mr-1" />
                    No thanks
                  </Button>
                  <Button
                    onClick={handleStart}
                    disabled={phase === "loading"}
                    className="flex-1 h-12 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black"
                    data-testid="button-rewarded-watch"
                  >
                    {phase === "loading" ? "Loading…" : "Watch Ad"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Playing: simulated ad (web only) ── */}
            {phase === "playing" && !IS_NATIVE && (
              <div className="flex flex-col">
                <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center gap-4 overflow-hidden">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl"
                  >
                    🧩
                  </motion.div>
                  <p className="text-white font-black text-xl text-center px-6">Puzzle Universe</p>
                  <p className="text-white/60 text-sm text-center px-8">Train your brain every day</p>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 border border-white/20">
                    <span className="text-white/70 text-xs font-bold tabular-nums">{timeLeft}s</span>
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/10 border border-white/20">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Ad</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">Earning your reward…</span>
                    <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+{REWARDED_AD_COINS}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                    <motion.div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                      style={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Complete: reward earned (web only) ── */}
            {phase === "complete" && !IS_NATIVE && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mb-5"
                >
                  <Coins className="w-12 h-12 text-yellow-400" />
                </motion.div>
                <h2 className="text-3xl font-black text-white mb-2">Reward Earned!</h2>
                <p className="text-muted-foreground mb-2">You watched the full ad</p>
                <div className="flex items-center gap-2 text-yellow-400 font-black text-3xl mb-8">
                  <span>+{REWARDED_AD_COINS}</span>
                  <Coins className="w-8 h-8" />
                </div>
                <Button
                  onClick={handleClaimReward}
                  className="w-full h-14 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl shadow-[0_4px_20px_rgba(234,179,8,0.4)]"
                  data-testid="button-claim-reward"
                >
                  Collect Coins
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
