import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Coins, Lightbulb, Star, Tv2,
  Pause, Play, RotateCcw, Home as HomeIcon, Zap
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BannerAd } from "@/components/BannerAd";
import { InterstitialAd } from "@/components/InterstitialAd";
import { RewardedAd } from "@/components/RewardedAd";
import { ComboDisplay } from "@/components/ComboDisplay";
import { recordLevelComplete, REWARDED_AD_COINS } from "@/lib/adManager";
import {
  getLevel,
  generateLevelBoard,
  getDifficultyColor,
  getHintMove
} from "@/lib/levels";
import {
  getProfile,
  addCoins,
  addXP,
  spendCoins,
  saveLevelProgress,
  calculateStars,
  getSettings,
  addLeaderboardEntry,
  unlockAchievement,
  getLevelProgress
} from "@/lib/gameStore";
import { saveCloudSave } from "@/lib/syncManager";
import {
  playTileSound,
  playWinSound,
  playPerfectWinSound,
  playHintSound,
  playComboSound,
  playErrorSound,
  vibrate
} from "@/lib/sounds";

const SOLVED_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTileStyle(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return {
        background: "linear-gradient(145deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)",
        boxShadow: "0 4px 12px rgba(109,40,217,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      };
    case "Medium":
      return {
        background: "linear-gradient(145deg, #f472b6 0%, #ec4899 50%, #be185d 100%)",
        boxShadow: "0 4px 12px rgba(190,24,93,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      };
    case "Hard":
      return {
        background: "linear-gradient(145deg, #38bdf8 0%, #0ea5e9 50%, #0369a1 100%)",
        boxShadow: "0 4px 12px rgba(3,105,161,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      };
    case "Ultra Hard":
      return {
        background: "linear-gradient(145deg, #fb923c 0%, #f97316 50%, #c2410c 100%)",
        boxShadow: "0 4px 12px rgba(194,65,12,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      };
    default:
      return {
        background: "linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)",
        boxShadow: "0 4px 12px rgba(109,40,217,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
      };
  }
}

function getBoardGlow(difficulty: string) {
  switch (difficulty) {
    case "Easy":       return "rgba(109,40,217,0.3)";
    case "Medium":     return "rgba(190,24,93,0.3)";
    case "Hard":       return "rgba(3,105,161,0.3)";
    case "Ultra Hard": return "rgba(194,65,12,0.3)";
    default:           return "rgba(109,40,217,0.3)";
  }
}

export default function Game() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const levelNum = parseInt(params.level || "1");
  const { toast } = useToast();

  const [board, setBoard] = useState<number[]>(SOLVED_STATE);
  const [level, setLevel] = useState(getLevel(levelNum));
  const [profile, setProfile] = useState(getProfile());
  const [settings, setSettings] = useState(getSettings());

  const [isWon, setIsWon] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [hintIndex, setHintIndex] = useState<number>(-1);
  const [starsEarned, setStarsEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  // Combo system
  const [combo, setCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const lastMoveTimeRef = useRef<number>(0);
  const comboResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated move counter (for bounce effect on move change)
  const [moveFlash, setMoveFlash] = useState(false);

  // Ad state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const pendingNavRef = useRef<string | null>(null);

  // Initialize board
  useEffect(() => {
    setLevel(getLevel(levelNum));
    setBoard(generateLevelBoard(levelNum));
    setMoves(0);
    setTime(0);
    setIsWon(false);
    setIsPaused(false);
    setIsPlaying(false);
    setHintIndex(-1);
    setCombo(0);
    setComboMultiplier(1);
    lastMoveTimeRef.current = 0;
    setProfile(getProfile());
    setSettings(getSettings());
  }, [levelNum]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && !isWon && !isPaused) {
      interval = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isWon, isPaused]);

  // Win detection
  useEffect(() => {
    if (isPlaying && !isWon && board.join(",") === SOLVED_STATE.join(",")) {
      setIsWon(true);
      setIsPlaying(false);
      setHintIndex(-1);
      if (comboResetRef.current) clearTimeout(comboResetRef.current);

      const stars = calculateStars(moves, level.par);
      const earnedCoins = stars * 10 + Math.floor(comboMultiplier * 5);
      const earnedXp = Math.round((stars * 25 + 10) * comboMultiplier);

      setStarsEarned(stars);
      setCoinsEarned(earnedCoins);
      setXpEarned(earnedXp);

      if (settings.soundEnabled) {
        stars === 3 ? playPerfectWinSound() : playWinSound();
      }
      if (settings.vibrationEnabled) vibrate([100, 50, 100, 50, 200]);

      // Confetti burst
      const colors = ["#a78bfa", "#f472b6", "#38bdf8", "#fbbf24", "#34d399"];
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors });
      if (stars === 3) {
        setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 50, origin: { x: 0 }, colors }), 300);
        setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 50, origin: { x: 1 }, colors }), 500);
      }

      // Save progress
      const prevProg = getLevelProgress(levelNum);
      const bestMoves = prevProg ? Math.min(prevProg.bestMoves, moves) : moves;
      const bestTime = prevProg ? Math.min(prevProg.bestTime, time) : time;

      saveLevelProgress(levelNum, {
        stars: Math.max(prevProg?.stars || 0, stars),
        bestMoves,
        bestTime,
        coins: (prevProg?.coins || 0) + earnedCoins
      });

      addXP(earnedXp);
      addCoins(earnedCoins);
      setProfile(getProfile());

      saveCloudSave().catch(() => {});

      if (recordLevelComplete()) setTimeout(() => setShowInterstitial(true), 2800);

      // Achievements
      if (levelNum === 1) unlockAchievement("first_solve");
      if (levelNum === 10) unlockAchievement("level_10");
      if (levelNum === 50) unlockAchievement("level_50");
      if (levelNum === 100) unlockAchievement("level_100");
      if (levelNum === 200) unlockAchievement("level_200");

      const allProgress = JSON.parse(localStorage.getItem("pz_progress") || "{}");
      let totalStars = 0;
      for (const val of Object.values(allProgress)) totalStars += (val as any).stars;

      const p = getProfile();
      addLeaderboardEntry({
        name: p.name,
        level: levelNum,
        stars: totalStars,
        xp: p.xp + (p.level - 1) * 100,
        date: new Date().toISOString()
      });
    }
  }, [board, isPlaying, isWon, moves, time, level.par, levelNum, settings, comboMultiplier]);

  const canMove = useCallback((index: number) => {
    const emptyIndex = board.indexOf(0);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const emptyRow = Math.floor(emptyIndex / 4);
    const emptyCol = emptyIndex % 4;
    return (
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow)
    );
  }, [board]);

  const moveTile = useCallback((index: number) => {
    if (isWon || isPaused) return;
    if (!canMove(index)) return;

    if (!isPlaying) setIsPlaying(true);

    // Combo tracking
    const now = Date.now();
    const gap = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;

    setCombo((prev) => {
      const next = gap < 1800 && prev > 0 ? prev + 1 : 1;
      const mult = next >= 15 ? 2 : next >= 10 ? 1.5 : next >= 5 ? 1.25 : 1;
      setComboMultiplier(mult);
      if (next >= 3 && settings.soundEnabled) playComboSound(next);
      return next;
    });

    if (comboResetRef.current) clearTimeout(comboResetRef.current);
    comboResetRef.current = setTimeout(() => {
      setCombo(0);
      setComboMultiplier(1);
    }, 2000);

    if (settings.soundEnabled) playTileSound();
    if (settings.vibrationEnabled) vibrate(12);

    const newBoard = [...board];
    const emptyIndex = newBoard.indexOf(0);
    [newBoard[index], newBoard[emptyIndex]] = [newBoard[emptyIndex], newBoard[index]];

    setBoard(newBoard);
    setMoves((m) => m + 1);
    setMoveFlash(true);
    setTimeout(() => setMoveFlash(false), 200);
    setHintIndex(-1);
  }, [board, canMove, isPlaying, isWon, isPaused, settings]);

  const handleHint = () => {
    if (isWon || isPaused) return;
    if (!spendCoins(5)) {
      if (settings.soundEnabled) playErrorSound();
      toast({ title: "Not enough coins", description: "You need 5 coins for a hint.", variant: "destructive" });
      return;
    }
    setProfile(getProfile());
    if (settings.soundEnabled) playHintSound();
    if (settings.vibrationEnabled) vibrate([30, 20, 60]);
    const h = getHintMove(board);
    if (h !== -1) {
      setHintIndex(h);
      setTimeout(() => setHintIndex(-1), 2200);
    }
  };

  const handleRewardedComplete = useCallback((coins: number) => {
    addCoins(coins);
    setProfile(getProfile());
    setShowRewardedAd(false);
    toast({ title: `+${coins} Coins!`, description: "Reward collected." });
  }, [toast]);

  const handleInterstitialClose = useCallback(() => {
    setShowInterstitial(false);
    const nav = pendingNavRef.current;
    if (nav) { pendingNavRef.current = null; setLocation(nav); }
  }, [setLocation]);

  const navigateMaybeAd = useCallback((path: string) => {
    if (showInterstitial) { pendingNavRef.current = path; }
    else setLocation(path);
  }, [showInterstitial, setLocation]);

  // Touch handling
  const touchState = useRef({ startX: 0, startY: 0, tileIdx: -1 });
  const rafRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (isWon || !canMove(index)) return;
    touchState.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, tileIdx: index };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchState.current.tileIdx !== -1) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchState.current.tileIdx === -1) return;
    const dx = e.changedTouches[0].clientX - touchState.current.startX;
    const dy = e.changedTouches[0].clientY - touchState.current.startY;
    const emptyIndex = board.indexOf(0);
    const tileIdx = touchState.current.tileIdx;
    touchState.current.tileIdx = -1;

    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    let dir = "";
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) dir = dx > 0 ? "right" : "left";
    else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 18) dir = dy > 0 ? "down" : "up";

    let shouldMove = false;
    if (dir) {
      const row = Math.floor(tileIdx / 4); const col = tileIdx % 4;
      const emptyRow = Math.floor(emptyIndex / 4); const emptyCol = emptyIndex % 4;
      shouldMove =
        (col < emptyCol && row === emptyRow && dir === "right") ||
        (col > emptyCol && row === emptyRow && dir === "left") ||
        (row < emptyRow && col === emptyCol && dir === "down") ||
        (row > emptyRow && col === emptyCol && dir === "up");
    } else {
      shouldMove = Math.abs(dx) < 10 && Math.abs(dy) < 10;
    }

    if (shouldMove) {
      rafRef.current = requestAnimationFrame(() => { rafRef.current = null; moveTile(tileIdx); });
    }
  };

  const diffColor = getDifficultyColor(level.difficulty);
  const tileStyle = getTileStyle(level.difficulty);
  const boardGlow = getBoardGlow(level.difficulty);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center max-w-[480px] mx-auto relative overflow-hidden">

      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(240 30% 6%) 100%)" }}
        />
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${diffColor}, transparent)` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 sticky top-0 z-20"
        style={{
          background: "rgba(10,8,20,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </motion.button>

          <div>
            <div className="font-black text-white text-base leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Level {level.number}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: diffColor }}>
              {level.difficulty}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Coins */}
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-black text-yellow-400 text-sm tabular-nums">{profile.coins}</span>
          </motion.div>

          {/* Pause */}
          {isPlaying && !isWon && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setIsPaused((p) => !p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {isPaused
                ? <Play className="w-4 h-4 text-white/80" />
                : <Pause className="w-4 h-4 text-white/80" />
              }
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center px-4 pt-4 pb-4">

        {/* Stats bar */}
        <div className="w-full max-w-sm mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Moves", value: moves.toString(), flash: moveFlash },
            { label: "Par", value: level.par.toString(), flash: false },
            { label: "Time", value: formatTime(time), flash: false },
          ].map(({ label, value, flash }) => (
            <motion.div
              key={label}
              className="flex flex-col items-center py-2.5 px-1 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              animate={flash ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              <span className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">{label}</span>
              <span className="text-2xl font-black text-white tabular-nums" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Combo display */}
        <div className="h-16 flex items-center justify-center mb-2">
          <ComboDisplay combo={combo} />
        </div>

        {/* Board */}
        <div
          className="w-full max-w-sm aspect-square rounded-3xl p-2.5 touch-none relative"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid rgba(255,255,255,0.08)`,
            boxShadow: `0 0 40px ${boardGlow}, 0 20px 60px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Board inner glow line */}
          <div
            className="absolute top-0 left-4 right-4 h-px rounded-full opacity-40"
            style={{ background: `linear-gradient(90deg, transparent, ${diffColor}, transparent)` }}
          />

          <div className="grid grid-cols-4 grid-rows-4 gap-1.5 w-full h-full">
            {board.map((tile, index) => {
              const isEmpty = tile === 0;
              const isMovable = canMove(index);
              const isHinted = index === hintIndex;

              return (
                <motion.div
                  layout
                  key={tile}
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 32, mass: 1.2 }}
                  className="relative flex items-center justify-center rounded-xl select-none touch-none overflow-hidden"
                  style={{
                    gridColumn: (index % 4) + 1,
                    gridRow: Math.floor(index / 4) + 1,
                    ...(isEmpty
                      ? {
                          background: "rgba(0,0,0,0.25)",
                          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
                        }
                      : {
                          ...tileStyle,
                          cursor: isMovable ? "pointer" : "default",
                          ...(isHinted && {
                            boxShadow: `0 0 0 3px #fbbf24, 0 0 20px rgba(251,191,36,0.6), ${tileStyle.boxShadow}`,
                          }),
                        }
                    ),
                  }}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => moveTile(index)}
                  whileTap={isMovable && !isEmpty ? { scale: 0.87 } : undefined}
                  data-testid={`tile-${isEmpty ? "empty" : tile}`}
                >
                  {!isEmpty && (
                    <>
                      {/* Inner highlight */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-xl" />
                      {/* Bottom shadow */}
                      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent rounded-b-xl" />
                      {/* Number */}
                      <span
                        className="relative z-10 text-xl font-black text-white select-none"
                        style={{
                          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        {tile}
                      </span>
                      {/* Hint pulse ring */}
                      {isHinted && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-yellow-400"
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-sm mt-5 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleHint}
            disabled={isWon}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-opacity disabled:opacity-40"
            style={{
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
            data-testid="button-hint"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
            <span className="text-xs opacity-60 flex items-center gap-0.5">
              -5 <Coins className="w-2.5 h-2.5" />
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowRewardedAd(true)}
            disabled={isWon}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-opacity disabled:opacity-40"
            style={{
              background: "rgba(168,85,247,0.1)",
              border: "1px solid rgba(168,85,247,0.25)",
              color: "#a78bfa",
            }}
            data-testid="button-watch-ad"
          >
            <Tv2 className="w-4 h-4" />
            <span className="text-xs">+{REWARDED_AD_COINS}</span>
            <Coins className="w-3 h-3" />
          </motion.button>
        </div>
      </div>

      <BannerAd className="border-t border-white/5" />

      {/* ── Pause overlay ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPaused && !isWon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xs rounded-3xl p-8 flex flex-col items-center gap-5"
              style={{
                background: "rgba(20,16,40,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
              >
                <Pause className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Paused
              </h2>
              <div className="text-center text-white/40 text-sm -mt-2">
                Take a breath. The puzzle will wait.
              </div>

              <div className="w-full flex flex-col gap-3 mt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPaused(false)}
                  className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-white"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}
                >
                  <Play className="w-5 h-5" />
                  Resume
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsPaused(false);
                    setBoard(generateLevelBoard(levelNum));
                    setMoves(0);
                    setTime(0);
                    setIsPlaying(false);
                    setIsWon(false);
                    setCombo(0);
                    setComboMultiplier(1);
                  }}
                  className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-white/70"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLocation("/")}
                  className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-white/50"
                >
                  <HomeIcon className="w-4 h-4" />
                  Quit to Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Win modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isWon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
              className="w-full max-w-sm rounded-3xl flex flex-col items-center overflow-hidden pb-6"
              style={{
                background: "linear-gradient(180deg, rgba(30,20,60,0.98) 0%, rgba(15,10,30,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(168,85,247,0.2)",
              }}
            >
              {/* Top gradient accent */}
              <div
                className="w-full h-1 mb-6"
                style={{ background: "linear-gradient(90deg, #7c3aed, #ec4899, #06b6d4)" }}
              />

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-center mb-6 px-6"
              >
                <div className="text-4xl font-black text-white mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Level Complete!
                </div>
                <div className="text-white/40 text-sm">
                  {starsEarned === 3 ? "Perfect solve!" : starsEarned === 2 ? "Great job!" : "Well done!"}
                </div>
              </motion.div>

              {/* Stars */}
              <div className="flex gap-3 mb-8">
                {[1, 2, 3].map((s) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, scale: 0, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + s * 0.2, type: "spring", stiffness: 400, damping: 16 }}
                  >
                    <Star
                      className="w-14 h-14"
                      style={
                        s <= starsEarned
                          ? {
                              fill: "#fbbf24",
                              color: "#fbbf24",
                              filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))",
                            }
                          : { fill: "transparent", color: "rgba(255,255,255,0.1)" }
                      }
                    />
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="w-full px-6 space-y-2 mb-7">
                {[
                  { label: "Moves", value: moves, suffix: "" },
                  { label: "Time",  value: formatTime(time), suffix: "" },
                  { label: "Coins", value: `+${coinsEarned}`, highlight: "text-yellow-400", icon: <Coins className="w-3.5 h-3.5" /> },
                  { label: "XP",    value: `+${xpEarned}`,   highlight: "text-purple-400", icon: <Zap className="w-3.5 h-3.5" /> },
                ].map(({ label, value, highlight, icon }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-between items-center px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-white/50 font-bold text-sm">{label}</span>
                    <span className={`font-black text-base flex items-center gap-1.5 ${highlight || "text-white"}`}>
                      {icon}{value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Buttons */}
              <div className="w-full px-6 flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateMaybeAd("/")}
                  className="flex-1 h-13 py-3.5 rounded-2xl font-bold text-white/60"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  data-testid="button-home"
                >
                  Home
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateMaybeAd(`/game/${levelNum + 1}`)}
                  className="flex-2 flex-1 h-13 py-3.5 rounded-2xl font-black text-white text-base"
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #ec4899)",
                    boxShadow: "0 4px 24px rgba(167,139,250,0.4)",
                    flex: "2",
                  }}
                  data-testid="button-next-level"
                >
                  Next Level →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <InterstitialAd isOpen={showInterstitial} onClose={handleInterstitialClose} />
      <RewardedAd isOpen={showRewardedAd} onRewarded={handleRewardedComplete} onDismiss={() => setShowRewardedAd(false)} />
    </div>
  );
}
