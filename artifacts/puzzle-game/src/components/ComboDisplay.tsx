import { motion, AnimatePresence } from "framer-motion";

interface ComboDisplayProps {
  combo: number;
}

const COMBO_LEVELS = [
  { min: 3,  max: 5,  label: "Nice!",        color: "#a78bfa", glow: "rgba(167,139,250,0.5)" },
  { min: 6,  max: 9,  label: "Great!",       color: "#60a5fa", glow: "rgba(96,165,250,0.5)"  },
  { min: 10, max: 14, label: "Amazing!",     color: "#34d399", glow: "rgba(52,211,153,0.5)"  },
  { min: 15, max: 19, label: "Incredible!",  color: "#fbbf24", glow: "rgba(251,191,36,0.6)"  },
  { min: 20, max: 999, label: "UNSTOPPABLE!", color: "#f43f5e", glow: "rgba(244,63,94,0.6)"  },
];

function getComboLevel(combo: number) {
  return COMBO_LEVELS.find(l => combo >= l.min && combo <= l.max) ?? null;
}

export function ComboDisplay({ combo }: ComboDisplayProps) {
  const level = getComboLevel(combo);

  return (
    <AnimatePresence mode="popLayout">
      {level && (
        <motion.div
          key={level.label}
          initial={{ opacity: 0, scale: 0.5, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="flex flex-col items-center pointer-events-none select-none"
        >
          {/* Combo label */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-lg font-black tracking-wide uppercase"
            style={{
              color: level.color,
              textShadow: `0 0 12px ${level.glow}, 0 0 24px ${level.glow}`,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {level.label}
          </motion.div>

          {/* Combo count */}
          <motion.div
            key={combo}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
            className="flex items-center gap-1 mt-0.5"
          >
            <span
              className="text-3xl font-black tabular-nums"
              style={{
                color: level.color,
                textShadow: `0 0 8px ${level.glow}`,
              }}
            >
              {combo}
            </span>
            <span className="text-sm font-bold text-white/50 mt-1">× COMBO</span>
          </motion.div>

          {/* Streak dots */}
          <div className="flex gap-1 mt-1">
            {Array.from({ length: Math.min(combo, 10) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: level.color, boxShadow: `0 0 4px ${level.glow}` }}
              />
            ))}
            {combo > 10 && (
              <span className="text-[10px] text-white/40 font-bold">+{combo - 10}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
