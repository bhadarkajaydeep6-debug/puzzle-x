import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Star, Lock, Gift, Cloud, RefreshCw, Zap, ChevronRight, Trophy } from "lucide-react";
import {
  getProfile, getAllProgress, isLevelUnlocked, canClaimDailyReward,
  claimDailyReward, xpForLevel, type PlayerProfile, type LevelProgress
} from "@/lib/gameStore";
import { getLevelsForDifficulty, getDifficultyColor, type Difficulty } from "@/lib/levels";
import { playDailyRewardSound, playCoinSound } from "@/lib/sounds";
import { loadCloudSave, type SyncStatus } from "@/lib/syncManager";
import { BottomNav } from "@/components/BottomNav";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Ultra Hard"];

const DIFF_CONFIGS: Record<Difficulty, { from: string; to: string; glow: string }> = {
  "Easy":       { from: "#a78bfa", to: "#7c3aed", glow: "rgba(124,58,237,0.35)" },
  "Medium":     { from: "#f472b6", to: "#be185d", glow: "rgba(190,24,93,0.35)"  },
  "Hard":       { from: "#38bdf8", to: "#0369a1", glow: "rgba(3,105,161,0.35)"  },
  "Ultra Hard": { from: "#fb923c", to: "#c2410c", glow: "rgba(194,65,12,0.35)"  },
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<Record<number, LevelProgress>>({});
  const [activeTab, setActiveTab] = useState<Difficulty>("Easy");
  const [showDaily, setShowDaily] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    setProfile(getProfile());
    setProgress(getAllProgress());

    if (canClaimDailyReward()) {
      // Short delay so it feels intentional
      setTimeout(() => setShowDaily(true), 800);
    }

    setCloudStatus("syncing");
    loadCloudSave().then((status) => {
      setCloudStatus(status);
      setProfile(getProfile());
      setProgress(getAllProgress());
      if (status === "success" || status === "idle") {
        setTimeout(() => setCloudStatus("idle"), 2500);
      }
    });
  }, []);

  const handleClaimDaily = () => {
    claimDailyReward();
    playDailyRewardSound();
    playCoinSound();
    setProfile(getProfile());
    setShowDaily(false);
  };

  if (!profile) return null;

  const levels = getLevelsForDifficulty(activeTab);
  const xpNeeded = xpForLevel(profile.level);
  const xpProgress = Math.min((profile.xp / xpNeeded) * 100, 100);
  const diffCfg = DIFF_CONFIGS[activeTab];

  const allProgress = getAllProgress();
  const totalStars = Object.values(allProgress).reduce((a, p) => a + (p.stars || 0), 0);
  const completedLevels = Object.keys(allProgress).length;

  return (
    <div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto flex flex-col pb-28 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12), transparent)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-64 -left-24 w-56 h-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent)" }}
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          background: "rgba(10,8,20,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Profile row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <motion.div
              whileTap={{ scale: 0.92 }}
              onClick={() => setLocation("/settings")}
              className="relative cursor-pointer"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-white"
                style={{
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.5)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
              {/* Level badge */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: "linear-gradient(135deg, #ec4899, #be185d)", border: "2px solid rgba(10,8,20,1)" }}
              >
                {profile.level}
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {profile.name}
                </span>
                {cloudStatus === "syncing" && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                {cloudStatus === "success" && <Cloud className="w-3 h-3 text-emerald-400" />}
                {cloudStatus === "error"   && <Cloud className="w-3 h-3 text-red-400" />}
              </div>
              <div className="text-[10px] text-white/35 font-medium flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-purple-400" />
                Level {profile.level} •{" "}
                <span className="text-purple-400 font-bold">{profile.xp}</span>
                &nbsp;/ {xpNeeded} XP
              </div>
            </div>
          </div>

          {/* Coins */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowDaily(canClaimDailyReward())}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-black text-yellow-400 text-sm tabular-nums">{profile.coins}</span>
          </motion.button>
        </div>

        {/* XP bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #a78bfa, #ec4899, #06b6d4)" }}
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-4 mt-4">
        {[
          { icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, value: totalStars, label: "Stars" },
          { icon: <Trophy className="w-3.5 h-3.5 text-purple-400" />, value: completedLevels, label: "Solved" },
          { icon: <Gift className="w-3.5 h-3.5 text-emerald-400" />, value: profile.dailyStreak, label: "Streak" },
        ].map(({ icon, value, label }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center py-2.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {icon}
              <span className="font-black text-white text-base tabular-nums" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {value}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Difficulty tabs ──────────────────────────────────────────────── */}
      <div className="flex px-4 pt-5 pb-2 gap-2 overflow-x-auto no-scrollbar snap-x">
        {DIFFICULTIES.map((diff) => {
          const isActive = activeTab === diff;
          const cfg = DIFF_CONFIGS[diff];
          const color = getDifficultyColor(diff);

          // Count completion for this difficulty
          const diffLevels = getLevelsForDifficulty(diff);
          const diffCompleted = diffLevels.filter((l) => progress[l.number]?.stars > 0).length;

          return (
            <motion.button
              key={diff}
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveTab(diff)}
              className="snap-center whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-black transition-all duration-200 flex-shrink-0"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${cfg.from}22, ${cfg.to}22)`
                  : "rgba(255,255,255,0.04)",
                border: isActive ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.06)",
                color: isActive ? color : "rgba(255,255,255,0.4)",
                boxShadow: isActive ? `0 4px 16px ${cfg.glow}` : "none",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              <span>{diff}</span>
              <span
                className="ml-1.5 text-[10px] font-bold opacity-60"
              >
                {diffCompleted}/{diffLevels.length}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Level grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-1 pb-2">
        <motion.div
          key={activeTab}
          className="grid grid-cols-5 gap-2.5"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.015 } },
            hidden: {},
          }}
        >
          {levels.map((level) => {
            const isUnlocked = isLevelUnlocked(level.number);
            const lvlProgress = progress[level.number];
            const stars = lvlProgress?.stars || 0;
            const cfg = DIFF_CONFIGS[level.difficulty as Difficulty];

            return (
              <motion.div
                key={level.number}
                variants={{
                  hidden: { opacity: 0, scale: 0.75, y: 8 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 22 } },
                }}
              >
                {isUnlocked ? (
                  <Link href={`/game/${level.number}`}>
                    <motion.div
                      whileTap={{ scale: 0.88 }}
                      className="aspect-square relative rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                      style={{
                        background:
                          stars > 0
                            ? `linear-gradient(145deg, ${cfg.from}22, ${cfg.to}22)`
                            : "rgba(255,255,255,0.04)",
                        border: stars > 0
                          ? `1px solid ${cfg.from}50`
                          : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: stars > 0 ? `0 4px 14px ${cfg.glow}` : "none",
                      }}
                    >
                      {/* Completed fill shimmer */}
                      {stars === 3 && (
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{ background: `linear-gradient(145deg, ${cfg.from}, ${cfg.to})` }}
                        />
                      )}

                      <span
                        className="font-black text-base leading-none mb-1"
                        style={{
                          color: stars > 0 ? cfg.from : "rgba(255,255,255,0.5)",
                          fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        {level.number}
                      </span>
                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className="w-2 h-2"
                            style={
                              s <= stars
                                ? { fill: cfg.from, color: cfg.from, filter: `drop-shadow(0 0 2px ${cfg.from})` }
                                : { fill: "transparent", color: "rgba(255,255,255,0.12)" }
                            }
                          />
                        ))}
                      </div>
                    </motion.div>
                  </Link>
                ) : (
                  <div
                    className="aspect-square rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <Lock className="w-4 h-4 text-white/15" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <BottomNav />

      {/* ── Daily Reward modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDaily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDaily(false); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(30,20,60,0.98) 0%, rgba(15,10,30,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
              }}
            >
              {/* Gold top accent */}
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)" }} />

              <div className="p-7 flex flex-col items-center">
                {/* Icon */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))",
                    border: "1px solid rgba(251,191,36,0.3)",
                    boxShadow: "0 8px 32px rgba(251,191,36,0.2)",
                  }}
                >
                  <Gift className="w-10 h-10 text-yellow-400" />
                </motion.div>

                <h2 className="text-3xl font-black text-white mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Daily Reward!
                </h2>
                <p className="text-white/40 text-sm text-center mb-7">
                  Day {(profile.dailyStreak || 0) + 1} streak •{" "}
                  {((profile.dailyStreak || 0) + 1) >= 7
                    ? "Amazing dedication!"
                    : "Keep it up for bonus coins!"}
                </p>

                {/* Streak days */}
                <div className="flex gap-1.5 mb-8 w-full justify-center">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                    const streak = (profile.dailyStreak || 0);
                    const claimed = d <= streak;
                    const isCurrent = d === streak + 1;
                    return (
                      <motion.div
                        key={d}
                        initial={isCurrent ? { scale: 0.8 } : {}}
                        animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{
                            background: claimed
                              ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                              : isCurrent
                              ? "rgba(251,191,36,0.2)"
                              : "rgba(255,255,255,0.05)",
                            border: isCurrent
                              ? "1px solid rgba(251,191,36,0.5)"
                              : claimed
                              ? "none"
                              : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: isCurrent ? "0 0 12px rgba(251,191,36,0.4)" : "none",
                          }}
                        >
                          {claimed ? (
                            <Star className="w-3.5 h-3.5 fill-white text-white" />
                          ) : (
                            <span
                              className="text-[9px] font-black"
                              style={{ color: isCurrent ? "#fbbf24" : "rgba(255,255,255,0.2)" }}
                            >
                              {d}d
                            </span>
                          )}
                        </div>
                        {d === 7 && (
                          <span className="text-[8px] text-yellow-400/60 font-bold">MAX</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Claim button */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleClaimDaily}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-black text-lg"
                  style={{
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    boxShadow: "0 6px 24px rgba(251,191,36,0.5)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <Gift className="w-5 h-5" />
                  Claim Reward
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
