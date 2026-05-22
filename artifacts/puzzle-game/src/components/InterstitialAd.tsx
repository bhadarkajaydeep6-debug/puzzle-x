// ─── InterstitialAd ──────────────────────────────────────────────────────────
// Unified interstitial ad component.
//
// • On Android (native)  → delegates to AdMob showNativeInterstitial().
//                          The native full-screen ad handles its own UI.
//                          This component renders nothing and calls onClose()
//                          after the native ad dismisses.
//
// • In browser / web     → renders an animated full-screen overlay with a
//                          simulated ad creative and a 5-second skip timer.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gamepad2, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTERSTITIAL_SKIP_DELAY, recordInterstitialShown } from "@/lib/adManager";
import { IS_NATIVE, showNativeInterstitial } from "@/lib/nativeAdManager";

interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
}

const AD_CREATIVES = [
  {
    headline: "Master Every Puzzle",
    subline: "1,000+ Brain-Bending Levels",
    cta: "Play Free",
    bg: "from-purple-900 to-indigo-900",
    accent: "#8b5cf6",
    icon: Gamepad2,
  },
  {
    headline: "Train Your Brain Daily",
    subline: "Improve Focus & Memory",
    cta: "Start Now",
    bg: "from-blue-900 to-cyan-900",
    accent: "#06b6d4",
    icon: Zap,
  },
  {
    headline: "Puzzle Champion",
    subline: "Compete on Global Leaderboards",
    cta: "Join Free",
    bg: "from-rose-900 to-pink-900",
    accent: "#e94560",
    icon: Star,
  },
];

export function InterstitialAd({ isOpen, onClose }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(INTERSTITIAL_SKIP_DELAY);
  const [canSkip, setCanSkip] = useState(false);
  const [creative] = useState(
    () => AD_CREATIVES[Math.floor(Math.random() * AD_CREATIVES.length)]
  );

  // ── Native path: delegate entirely to AdMob plugin ───────────────────────
  useEffect(() => {
    if (!isOpen || !IS_NATIVE) return;

    showNativeInterstitial()
      .then(() => {
        recordInterstitialShown();
        onClose();
      })
      .catch(() => onClose());
  }, [isOpen, onClose]);

  // ── Web path: countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || IS_NATIVE) return;
    setCountdown(INTERSTITIAL_SKIP_DELAY);
    setCanSkip(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || IS_NATIVE) return;
    if (countdown <= 0) { setCanSkip(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, countdown]);

  const handleClose = useCallback(() => {
    recordInterstitialShown();
    onClose();
  }, [onClose]);

  // Native renders nothing — the OS handles the full-screen ad
  if (IS_NATIVE) return null;

  const Icon = creative.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          data-testid="interstitial-ad"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className={`relative w-full max-w-[480px] h-full max-h-[600px] mx-4 rounded-3xl bg-gradient-to-br ${creative.bg} overflow-hidden flex flex-col items-center justify-center p-8 shadow-2xl`}
          >
            <div className="absolute top-4 left-4 px-2 py-0.5 rounded bg-white/10 border border-white/20">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Ad</span>
            </div>

            <div className="absolute top-4 right-4">
              {canSkip ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition-colors"
                  data-testid="button-skip-ad"
                >
                  <X className="w-4 h-4" />
                  Skip
                </motion.button>
              ) : (
                <div className="w-10 h-10 rounded-full bg-black/30 border border-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-sm tabular-nums">{countdown}</span>
                </div>
              )}
            </div>

            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
              style={{ background: `${creative.accent}30`, border: `2px solid ${creative.accent}60` }}
            >
              <Icon className="w-14 h-14" style={{ color: creative.accent }} />
            </div>

            <h2 className="text-3xl font-black text-white text-center mb-3 leading-tight">
              {creative.headline}
            </h2>
            <p className="text-white/70 text-center mb-10 text-lg">{creative.subline}</p>

            <Button
              className="w-full max-w-xs h-14 rounded-2xl text-lg font-black shadow-xl"
              style={{ background: creative.accent, color: "white" }}
              onClick={handleClose}
            >
              {creative.cta}
            </Button>

            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
              <motion.div
                className="h-full"
                style={{ background: creative.accent }}
                initial={{ width: "100%" }}
                animate={{ width: canSkip ? "100%" : `${(countdown / INTERSTITIAL_SKIP_DELAY) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
