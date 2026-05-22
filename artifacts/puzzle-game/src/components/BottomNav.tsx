import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, Trophy, Settings, Award } from "lucide-react";

const links = [
  { href: "/",             icon: Home,     label: "Home"     },
  { href: "/leaderboard",  icon: Trophy,   label: "Rank"     },
  { href: "/achievements", icon: Award,    label: "Awards"   },
  { href: "/settings",     icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div
      className="fixed bottom-0 w-full max-w-[480px] left-1/2 -translate-x-1/2 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Glassmorphism background */}
      <div
        className="mx-3 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(15, 12, 30, 0.85)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center h-16 px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative py-2"
              >
                {/* Active glow background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-x-2 inset-y-1.5 rounded-xl"
                    style={{
                      background: "rgba(168,85,247,0.15)",
                      border: "1px solid rgba(168,85,247,0.25)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="relative z-10"
                >
                  <Icon
                    className="w-5 h-5 transition-all duration-200"
                    style={{
                      color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.35)",
                      filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary)))" : "none",
                    }}
                  />
                </motion.div>

                <span
                  className="text-[10px] font-bold relative z-10 transition-all duration-200"
                  style={{
                    color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.35)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
