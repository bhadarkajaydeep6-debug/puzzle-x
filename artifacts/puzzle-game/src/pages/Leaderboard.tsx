import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Zap, Crown } from "lucide-react";
import { getLeaderboard, addLeaderboardEntry, getProfile, type LeaderboardEntry } from "@/lib/gameStore";
import { BottomNav } from "@/components/BottomNav";

const RANK_STYLES = [
  { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", glow: "rgba(251,191,36,0.4)", textColor: "#fbbf24", label: "👑" },
  { bg: "linear-gradient(135deg, #94a3b8, #64748b)", glow: "rgba(148,163,184,0.3)", textColor: "#94a3b8", label: "🥈" },
  { bg: "linear-gradient(135deg, #fb923c, #c2410c)", glow: "rgba(251,146,60,0.3)",  textColor: "#fb923c", label: "🥉" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank < 3) {
    const s = RANK_STYLES[rank];
    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
        style={{ background: s.bg, boxShadow: `0 4px 12px ${s.glow}` }}
      >
        {s.label}
      </div>
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
    >
      {rank + 1}
    </div>
  );
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => setEntries(getLeaderboard()), []);

  const handleAddScore = () => {
    const p = getProfile();
    let name = p.name;
    if (name === "Player") {
      const promptName = prompt("Enter your name for the leaderboard:");
      if (!promptName) return;
      name = promptName;
    }
    const allProgress = JSON.parse(localStorage.getItem("pz_progress") || "{}");
    let totalStars = 0;
    let highestLevel = 1;
    for (const [lvl, prog] of Object.entries(allProgress)) {
      totalStars += (prog as any).stars;
      if (Number(lvl) > highestLevel && (prog as any).stars > 0) highestLevel = Number(lvl);
    }
    addLeaderboardEntry({
      name,
      level: highestLevel,
      stars: totalStars,
      xp: p.xp + (p.level - 1) * 100,
      date: new Date().toISOString(),
    });
    setEntries(getLeaderboard());
  };

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
          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h1 className="font-black text-white text-lg leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Leaderboard
          </h1>
          <p className="text-[10px] text-white/30 font-bold">{entries.length} player{entries.length !== 1 ? "s" : ""} ranked</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 flex flex-col gap-3">
        {/* Top 3 podium */}
        {entries.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-center gap-3 mb-2 px-2"
          >
            {/* 2nd place */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2"
                style={{ background: "linear-gradient(135deg, rgba(148,163,184,0.2), rgba(100,116,139,0.2))", border: "1px solid rgba(148,163,184,0.3)" }}
              >
                {entries[1].name.charAt(0).toUpperCase()}
              </div>
              <div
                className="w-full py-3 rounded-t-2xl flex flex-col items-center"
                style={{ background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.15)" }}
              >
                <span className="text-[10px] font-black text-slate-400">🥈 2nd</span>
                <span className="text-xs font-black text-white truncate max-w-full px-2">{entries[1].name}</span>
                <span className="text-xs text-yellow-400 font-bold flex items-center gap-0.5 mt-0.5">
                  <Star className="w-2.5 h-2.5 fill-yellow-400" />{entries[1].stars}
                </span>
              </div>
            </motion.div>

            {/* 1st place */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex-1 flex flex-col items-center"
              style={{ transform: "translateY(-12px)" }}
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="text-xl mb-1"
              >
                👑
              </motion.div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mb-2 text-white"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  boxShadow: "0 8px 24px rgba(251,191,36,0.5)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {entries[0].name.charAt(0).toUpperCase()}
              </div>
              <div
                className="w-full py-4 rounded-t-2xl flex flex-col items-center"
                style={{
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  boxShadow: "0 0 20px rgba(251,191,36,0.15)",
                }}
              >
                <span className="text-[10px] font-black text-yellow-400">🥇 1st</span>
                <span className="text-sm font-black text-white truncate max-w-full px-2">{entries[0].name}</span>
                <span className="text-sm text-yellow-400 font-black flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-yellow-400" />{entries[0].stars}
                </span>
              </div>
            </motion.div>

            {/* 3rd place */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2"
                style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.2), rgba(194,65,12,0.2))", border: "1px solid rgba(251,146,60,0.3)" }}
              >
                {entries[2].name.charAt(0).toUpperCase()}
              </div>
              <div
                className="w-full py-3 rounded-t-2xl flex flex-col items-center"
                style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.15)" }}
              >
                <span className="text-[10px] font-black text-orange-400">🥉 3rd</span>
                <span className="text-xs font-black text-white truncate max-w-full px-2">{entries[2].name}</span>
                <span className="text-xs text-yellow-400 font-bold flex items-center gap-0.5 mt-0.5">
                  <Star className="w-2.5 h-2.5 fill-yellow-400" />{entries[2].stars}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Full list */}
        {entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <Trophy className="w-16 h-16 text-white/10 mb-4" />
            <p className="text-white/30 font-bold text-base">No entries yet</p>
            <p className="text-white/20 text-sm mt-1">Complete levels to appear here</p>
          </div>
        ) : (
          <motion.div
            className="flex flex-col gap-2"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
          >
            {entries.map((entry, idx) => {
              const isTop3 = idx < 3;
              const rankStyle = isTop3 ? RANK_STYLES[idx] : null;

              return (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 28 } },
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: isTop3
                      ? `linear-gradient(135deg, ${rankStyle!.glow.replace("0.4", "0.08").replace("0.3", "0.06")}, rgba(255,255,255,0.02))`
                      : "rgba(255,255,255,0.03)",
                    border: isTop3
                      ? `1px solid ${rankStyle!.textColor}30`
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <RankBadge rank={idx} />

                  <div className="flex-1 min-w-0">
                    <div
                      className="font-black text-white text-sm truncate"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      {entry.name}
                    </div>
                    <div className="text-xs text-white/30 font-medium">
                      Level {entry.level} reached
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1 font-black text-sm text-yellow-400">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {entry.stars}
                    </div>
                    <div className="flex items-center gap-0.5 text-[10px] text-purple-400 font-bold">
                      <Zap className="w-2.5 h-2.5" />
                      {entry.xp} XP
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Add score button */}
      <div className="px-4 pb-4 pt-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAddScore}
          className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-white"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            boxShadow: "0 4px 20px rgba(251,191,36,0.35)",
            fontFamily: "'Nunito', sans-serif",
            color: "#000",
          }}
        >
          <Crown className="w-5 h-5" />
          Submit My Score
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
