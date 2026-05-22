import { motion } from "framer-motion";

function PuzzleXLogo() {
  return (
    <svg width="96" height="96" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ls-bg" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a0a2e"/>
          <stop offset="100%" stopColor="#0a0814"/>
        </linearGradient>
        <linearGradient id="ls-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id="ls-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ec4899"/>
          <stop offset="100%" stopColor="#be185d"/>
        </linearGradient>
        <filter id="ls-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ls-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7c3aed" floodOpacity="0.6"/>
        </filter>
      </defs>
      <rect width="180" height="180" rx="36" fill="url(#ls-bg)"/>
      <rect x="28" y="28" width="55" height="55" rx="12" fill="url(#ls-tile)" filter="url(#ls-shadow)"/>
      <rect x="28" y="28" width="55" height="16" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="97" y="28" width="55" height="55" rx="12" fill="url(#ls-tile)" filter="url(#ls-shadow)"/>
      <rect x="97" y="28" width="55" height="16" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="28" y="97" width="55" height="55" rx="12" fill="url(#ls-accent)" filter="url(#ls-shadow)"/>
      <rect x="28" y="97" width="55" height="16" rx="12" fill="rgba(255,255,255,0.18)"/>
      <rect x="97" y="97" width="55" height="55" rx="12" fill="rgba(167,139,250,0.06)" stroke="rgba(167,139,250,0.25)" strokeWidth="2" strokeDasharray="6 4"/>
      <text x="124.5" y="133" textAnchor="middle" dominantBaseline="middle"
            fontFamily="system-ui, sans-serif" fontWeight="900"
            fontSize="28" fill="url(#ls-tile)" filter="url(#ls-glow)" opacity="0.9">X</text>
    </svg>
  );
}

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background overflow-hidden"
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full -top-32 -left-32 opacity-20"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full -bottom-20 -right-20 opacity-15"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.06), transparent)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Logo mark */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-6"
      >
        <PuzzleXLogo />
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-[36px]"
          style={{ border: "2px solid rgba(167,139,250,0.4)" }}
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-baseline gap-0 mb-1"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <span className="text-4xl font-black text-white tracking-tight">Puzzle</span>
        <span
          className="text-4xl font-black tracking-tight"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          X
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm font-bold mb-10 tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Nunito', sans-serif" }}
      >
        Master the grid
      </motion.p>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-44 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #a78bfa, #ec4899)" }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
        />
      </motion.div>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "rgba(167,139,250,0.6)" }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
