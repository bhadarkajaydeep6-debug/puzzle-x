import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getSettings } from "@/lib/gameStore";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Leaderboard from "@/pages/Leaderboard";
import Settings from "@/pages/Settings";
import Achievements from "@/pages/Achievements";

const queryClient = new QueryClient();

// Apply the active theme class to <html> element
function applyTheme(theme: string) {
  const root = document.documentElement;
  root.classList.remove("theme-ocean", "theme-neon", "theme-sunset");
  if (theme && theme !== "cosmic") root.classList.add(`theme-${theme}`);
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/game/:level" component={Game} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/achievements" component={Achievements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apply saved theme immediately on boot
    try {
      const s = getSettings();
      applyTheme(s.theme || "cosmic");
    } catch {}

    // Show loading screen for a short, pleasant duration
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AnimatePresence mode="wait">
          {loading && <LoadingScreen key="loading" />}
        </AnimatePresence>

        {!loading && (
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        )}

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Expose applyTheme so Settings page can call it for live preview
export { applyTheme };
export default App;
