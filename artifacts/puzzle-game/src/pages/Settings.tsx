import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Info, Trash2, Cloud, CloudOff, Copy, Check,
  RefreshCw, Smartphone, Volume2, Vibrate, Palette,
} from "lucide-react";
import {
  getSettings, saveSettings, getProfile, saveProfile,
  type GameSettings, type GameTheme,
} from "@/lib/gameStore";
import {
  getPlayerId, setPlayerId, getLastSyncTime,
  saveCloudSave, fullSync, deleteCloudSave, type SyncStatus,
} from "@/lib/syncManager";
import { applyTheme } from "@/App";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const THEMES: { id: GameTheme; label: string; from: string; to: string }[] = [
  { id: "cosmic",  label: "Cosmic",  from: "#a78bfa", to: "#7c3aed" },
  { id: "ocean",   label: "Ocean",   from: "#38bdf8", to: "#0369a1" },
  { id: "neon",    label: "Neon",    from: "#4ade80", to: "#16a34a" },
  { id: "sunset",  label: "Sunset",  from: "#fb923c", to: "#be185d" },
];

function syncStatusLabel(status: SyncStatus): { text: string; color: string } {
  switch (status) {
    case "syncing":  return { text: "Syncing…",        color: "text-blue-400" };
    case "success":  return { text: "Saved to cloud",  color: "text-emerald-400" };
    case "error":    return { text: "Sync failed",     color: "text-red-400" };
    case "conflict": return { text: "Conflict resolved", color: "text-yellow-400" };
    case "offline":  return { text: "Offline",         color: "text-white/40" };
    default:         return { text: "Not synced yet",  color: "text-white/40" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-white/30 font-black px-1">{title}</p>
      <div
        className="rounded-2xl overflow-hidden divide-y"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      {children}
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    vibrationEnabled: true,
    theme: "cosmic",
  });
  const [name, setName] = useState("");
  const [playerId, setPlayerIdState] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState("");
  const [showSyncInput, setShowSyncInput] = useState(false);
  const [syncCodeError, setSyncCodeError] = useState("");

  useEffect(() => {
    setSettings(getSettings());
    setName(getProfile().name);
    setPlayerIdState(getPlayerId());
    setLastSync(getLastSyncTime());
  }, []);

  const updateSettings = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const handleTheme = (theme: GameTheme) => {
    updateSettings({ theme });
    applyTheme(theme);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    const p = getProfile();
    p.name = e.target.value;
    saveProfile(p);
  };

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(playerId);
    } catch {
      const el = document.createElement("textarea");
      el.value = playerId;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [playerId]);

  const handleSyncNow = useCallback(async () => {
    setSyncStatus("syncing");
    const result = await saveCloudSave(true);
    setSyncStatus(result);
    setLastSync(getLastSyncTime());
  }, []);

  const handleApplySyncCode = useCallback(async () => {
    const trimmed = syncCodeInput.trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(trimmed)) {
      setSyncCodeError("Invalid sync code. Copy it exactly from another device.");
      return;
    }
    setSyncCodeError("");
    setPlayerId(trimmed);
    setPlayerIdState(trimmed);
    setSyncCodeInput("");
    setShowSyncInput(false);
    setSyncStatus("syncing");
    const result = await fullSync();
    setSyncStatus(result);
    setLastSync(getLastSyncTime());
  }, [syncCodeInput]);

  const handleReset = async () => {
    await deleteCloudSave(getPlayerId());
    localStorage.clear();
    window.location.href = "/";
  };

  const { text: statusText, color: statusColor } = syncStatusLabel(syncStatus);
  const formattedLastSync = lastSync
    ? new Date(lastSync).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto flex flex-col pb-28"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(10,8,20,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setLocation("/" as any)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          data-testid="button-back"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </motion.button>
        <h1 className="font-black text-white text-xl" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Settings
        </h1>
      </div>

      <div className="flex-1 px-4 pt-5 flex flex-col gap-6 overflow-y-auto">

        {/* Profile */}
        <Section title="Profile">
          <div className="px-4 py-4">
            <p className="text-sm font-bold text-white/60 mb-2">Player Name</p>
            <Input
              value={name}
              onChange={handleNameChange}
              maxLength={32}
              className="rounded-xl h-11 text-base font-bold"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
              }}
              data-testid="input-player-name"
            />
          </div>
        </Section>

        {/* Theme */}
        <Section title="Theme">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-white/40" />
              <p className="text-sm font-bold text-white/60">Color Theme</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((t) => {
                const isActive = settings.theme === t.id;
                return (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleTheme(t.id)}
                    className="relative h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                      border: isActive
                        ? `2px solid white`
                        : "2px solid transparent",
                      boxShadow: isActive
                        ? `0 0 16px ${t.from}80`
                        : "none",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20" />
                    <span
                      className="relative z-10 font-black text-white text-sm"
                      style={{ fontFamily: "'Nunito', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                    >
                      {t.label}
                    </span>
                    {isActive && (
                      <div
                        className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row>
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-white/40" />
              <span className="text-base font-bold text-white">Sound Effects</span>
            </div>
            <Switch
              id="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
              data-testid="toggle-sound"
            />
          </Row>
          <Row>
            <div className="flex items-center gap-3">
              <Vibrate className="w-4 h-4 text-white/40" />
              <span className="text-base font-bold text-white">Vibration</span>
            </div>
            <Switch
              id="vib-toggle"
              checked={settings.vibrationEnabled}
              onCheckedChange={(v) => updateSettings({ vibrationEnabled: v })}
              data-testid="toggle-vibration"
            />
          </Row>
        </Section>

        {/* Cloud Sync */}
        <Section title="Cloud Sync">
          {/* Status row */}
          <Row>
            <div className="flex items-center gap-3">
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              ) : syncStatus === "offline" ? (
                <CloudOff className="w-4 h-4 text-white/40" />
              ) : (
                <Cloud className="w-4 h-4 text-white/40" />
              )}
              <div>
                <p className="text-sm font-bold text-white">Cloud Backup</p>
                <p className={`text-xs ${statusColor}`}>
                  {statusText}
                  {formattedLastSync && syncStatus !== "syncing" && (
                    <span className="text-white/25"> · {formattedLastSync}</span>
                  )}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNow}
              disabled={syncStatus === "syncing"}
              className="rounded-xl h-8 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              data-testid="button-sync-now"
            >
              Sync Now
            </Button>
          </Row>

          {/* Sync code */}
          <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-white">Your Sync Code</p>
                <p className="text-xs text-white/30">Use this to continue on another device</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyId}
                className="rounded-xl h-8 gap-1.5 text-xs font-bold"
                data-testid="button-copy-sync-code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div
              className="px-3 py-2.5 rounded-xl font-mono text-xs text-white/40 break-all select-all"
              style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {playerId}
            </div>
          </div>

          {/* Enter sync code */}
          <div className="px-4 py-4">
            {!showSyncInput ? (
              <button
                onClick={() => setShowSyncInput(true)}
                className="flex items-center gap-2 text-sm font-bold text-primary/80 w-full"
                data-testid="button-enter-sync-code"
              >
                <Smartphone className="w-4 h-4" />
                Switch to a different sync code
              </button>
            ) : (
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-white/60">Enter sync code from another device</Label>
                <div className="flex gap-2">
                  <Input
                    value={syncCodeInput}
                    onChange={(e) => { setSyncCodeInput(e.target.value); setSyncCodeError(""); }}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="rounded-xl font-mono text-xs h-10 flex-1"
                    style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                    data-testid="input-sync-code"
                  />
                  <Button size="sm" onClick={handleApplySyncCode} className="rounded-xl h-10 px-3 font-bold" data-testid="button-apply-sync-code">
                    Apply
                  </Button>
                </div>
                {syncCodeError && <p className="text-xs text-red-400">{syncCodeError}</p>}
                <button
                  onClick={() => { setShowSyncInput(false); setSyncCodeError(""); }}
                  className="text-xs text-white/30 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Danger zone */}
        <div className="flex flex-col gap-4 pb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-red-400"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                data-testid="button-reset"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Progress
              </motion.button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90%] max-w-[400px] rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all local and cloud progress — levels, coins, achievements, and your sync code. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:space-x-0">
                <AlertDialogCancel className="rounded-xl h-12">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-12"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="text-center flex flex-col items-center gap-1 text-white/20 text-sm">
            <Info className="w-4 h-4 opacity-40" />
            <span className="text-xs">Puzzle Flow v2.1.0</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
