import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Lock, Star } from "lucide-react";
import { getAchievements, type Achievement } from "@/lib/gameStore";
import { BottomNav } from "@/components/BottomNav";

const ACHIEVEMENT_DEFS = [
  { id: "first_solve",  icon: "🌟", title: "First Steps",       desc: "Complete your first level",              color: "#a78bfa", glow: "rgba(167,139,250,0.3)" },
  { id: "coins_100",    icon: "💰", title: "Coin Collector",    desc: "Earn 100 total coins",                   color: "#fbbf24", glow: "rgba(251,191,36,0.3)"  },
  { id: "streak_3",     icon: "🔥", title: "On Fire",           desc: "Claim daily reward 3 days in a row",    color: "#f97316", glow: "rgba(249,115,22,0.3)"  },
  { id: "stars_10",     icon: "⭐", title: "Star Gazer",        desc: "Earn 10 stars total",                   color: "#fbbf24", glow: "rgba(251,191,36,0.3)"  },
  { id: "level_10",     icon: "🏅", title: "Getting Serious",   desc: "Complete level 10",                     color: "#60a5fa", glow: "rgba(96,165,250,0.3)"  },
  { id: "level_50",     icon: "🥇", title: "Halfway There",     desc: "Complete level 50",                     color: "#34d399", glow: "rgba(52,211,153,0.3)"  },
  { id: "level_100",    icon: "💎", title: "Century",           desc: "Complete level 100",                    color: "#818cf8", glow: "rgba(129,140,248,0.3)" },
  { id: "perfect_easy", icon: "✨", title: "Easy Master",       desc: "3-star all Easy levels",                color: "#c084fc", glow: "rgba(192,132,252,0.3)" },
  { id: "speedster",    icon: "⚡", title: "Speedster",         desc: "Solve a level in under 30 seconds",     color: "#facc15", glow: "rgba(250,204,21,0.3)"  },
  { id: "no_hint",      icon: "🧠", title: "Big Brain",         desc: "Complete 5 levels without hints",       color: "#2dd4bf", glow: "rgba(45,212,191,0.3)"  },
  { id: "level_200",    icon: "👑", title: "Puzzle Master",     desc: "Complete all 200 levels",               color: "#f43f5e", glow: "rgba(244,63,94,0.3)"   },
  { id: "coin_hoarder", icon: "🏦", title: "Coin Hoarder",      desc: "Accumulate 500 coins",                  color: "#fbbf24", glow: "rgba(251,191,36,0.3)"  },
];

export default function Achievements() {
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});

  useEffect(() => setAchievements(getAchievements()), []);

  const unlockedCount = Object.values(achievements).filter((a) => a.unlocked).length;
  const total = ACHIEVEMENT_DEFS.length;
  const pct = (unlockedCount / total) * 100;

  return (
    <div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto flex flex-col pb-28"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(10,8,20,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}
        >
          <Award className="w-4.5 h-4.5 text-purple-400" style={{ width: "18px", height: "18px" }} />
        </div>
        <div>
          <h1 className="font-black text-white text-lg leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Achievements
          </h1>
          <p className="text-[10px] text-white/30 font-bold">{unlockedCount} of {total} unlocked</p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">
        {/* Progress bar */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-black text-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Overall Progress
              </span>
            </div>
            <span className="text-sm font-black tabular-nums" style={{ color: "hsl(var(--primary))" }}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #a78bfa, #ec4899, #06b6d4)" }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/30 mt-2 font-medium">
            {total - unlockedCount} more to unlock
          </p>
        </div>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
        >
          {ACHIEVEMENT_DEFS.map((def) => {
            const state = achievements[def.id];
            const isUnlocked = state?.unlocked;

            return (
              <motion.div
                key={def.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.85, y: 10 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 24 } },
                }}
                className="relative flex flex-col items-center text-center p-4 rounded-2xl overflow-hidden"
                style={
                  isUnlocked
                    ? {
                        background: `linear-gradient(145deg, ${def.glow.replace("0.3", "0.12")}, rgba(255,255,255,0.03))`,
                        border: `1px solid ${def.color}40`,
                        boxShadow: `0 4px 20px ${def.glow}`,
                      }
                    : {
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }
                }
              >
                {/* Lock badge */}
                {!isUnlocked && (
                  <div className="absolute top-2.5 right-2.5">
                    <Lock className="w-3.5 h-3.5 text-white/15" />
                  </div>
                )}

                {/* Unlock shimmer top line */}
                {isUnlocked && (
                  <div
                    className="absolute top-0 left-4 right-4 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${def.color}, transparent)` }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`text-4xl mb-3 transition-all duration-300 ${!isUnlocked ? "grayscale opacity-30" : ""}`}
                >
                  {def.icon}
                </div>

                <h3
                  className="text-sm font-black leading-tight mb-1"
                  style={{
                    color: isUnlocked ? def.color : "rgba(255,255,255,0.2)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {def.title}
                </h3>
                <p className="text-[10px] leading-snug" style={{ color: isUnlocked ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" }}>
                  {def.desc}
                </p>

                {isUnlocked && state.unlockedAt && (
                  <div
                    className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${def.color}20`, color: def.color }}
                  >
                    {new Date(state.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
