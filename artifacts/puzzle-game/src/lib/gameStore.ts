// artifacts/puzzle-game/src/lib/gameStore.ts
// All game state persisted to localStorage

export interface LevelProgress {
  stars: number;        // 0 = locked/unplayed, 1-3 = completed
  bestMoves: number;
  bestTime: number;
  coins: number;        // coins earned on this level
}

export interface PlayerProfile {
  name: string;
  xp: number;
  level: number;        // player level (not puzzle level)
  coins: number;
  totalCoins: number;   // lifetime earned
  dailyRewardLastClaimed: string; // ISO date string
  dailyStreak: number;
}

export type GameTheme = "cosmic" | "ocean" | "neon" | "sunset";

export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: GameTheme;
}

export interface Achievement {
  id: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  name: string;
  level: number;        // highest puzzle level reached
  stars: number;        // total stars
  xp: number;
  date: string;
}

// localStorage keys
const KEYS = {
  profile: 'pz_profile',
  progress: 'pz_progress',
  settings: 'pz_settings',
  achievements: 'pz_achievements',
  leaderboard: 'pz_leaderboard',
};

// --- Profile ---
export function getProfile(): PlayerProfile {
  try {
    const s = localStorage.getItem(KEYS.profile);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    name: 'Player',
    xp: 0,
    level: 1,
    coins: 50,       // starter coins
    totalCoins: 50,
    dailyRewardLastClaimed: '',
    dailyStreak: 0,
  };
}
export function saveProfile(p: PlayerProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(p));
}

// --- Level Progress ---
export function getAllProgress(): Record<number, LevelProgress> {
  try {
    const s = localStorage.getItem(KEYS.progress);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}
export function getLevelProgress(levelNum: number): LevelProgress | null {
  const all = getAllProgress();
  return all[levelNum] ?? null;
}
export function saveLevelProgress(levelNum: number, progress: LevelProgress) {
  const all = getAllProgress();
  all[levelNum] = progress;
  localStorage.setItem(KEYS.progress, JSON.stringify(all));
}

// Returns true if a level is unlocked (level 1 always unlocked; others need previous completed)
export function isLevelUnlocked(levelNum: number): boolean {
  if (levelNum === 1) return true;
  const prev = getLevelProgress(levelNum - 1);
  return prev !== null && prev.stars > 0;
}

// --- Settings ---
export function getSettings(): GameSettings {
  try {
    const s = localStorage.getItem(KEYS.settings);
    if (s) return JSON.parse(s);
  } catch {}
  return { soundEnabled: true, vibrationEnabled: true, theme: "cosmic" };
}
export function saveSettings(s: GameSettings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(s));
}

// --- Achievements ---
const ACHIEVEMENT_IDS = [
  'first_solve',      // Complete level 1
  'coins_100',        // Earn 100 coins total
  'streak_3',         // 3-day daily streak
  'stars_10',         // Earn 10 stars total
  'level_10',         // Complete level 10
  'level_50',         // Complete level 50
  'level_100',        // Complete level 100
  'perfect_easy',     // 3-star all Easy levels
  'speedster',        // Solve in under 30 seconds
  'no_hint',          // Complete 5 levels without hints
  'level_200',        // Complete level 200
  'coin_hoarder',     // Accumulate 500 coins
];

export function getAchievements(): Record<string, Achievement> {
  try {
    const s = localStorage.getItem(KEYS.achievements);
    if (s) return JSON.parse(s);
  } catch {}
  // Initialize all achievements as locked
  const result: Record<string, Achievement> = {};
  ACHIEVEMENT_IDS.forEach(id => { result[id] = { id, unlocked: false }; });
  return result;
}
export function unlockAchievement(id: string): boolean {
  const all = getAchievements();
  if (!all[id] || all[id].unlocked) return false;
  all[id] = { id, unlocked: true, unlockedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.achievements, JSON.stringify(all));
  return true;
}

// XP needed to go from player level N to N+1
export function xpForLevel(level: number): number {
  return level * 100;
}

// Add XP to profile, handle level ups, return new profile
export function addXP(amount: number): PlayerProfile {
  const p = getProfile();
  p.xp += amount;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
  }
  saveProfile(p);
  return p;
}

// Add coins to profile
export function addCoins(amount: number): PlayerProfile {
  const p = getProfile();
  p.coins += amount;
  p.totalCoins += amount;
  saveProfile(p);
  return p;
}

// Spend coins — returns false if not enough
export function spendCoins(amount: number): boolean {
  const p = getProfile();
  if (p.coins < amount) return false;
  p.coins -= amount;
  saveProfile(p);
  return true;
}

// --- Leaderboard ---
export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const s = localStorage.getItem(KEYS.leaderboard);
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}

export function addLeaderboardEntry(entry: LeaderboardEntry) {
  const all = getLeaderboard();
  // Replace entry for same name if score is better
  const existingIdx = all.findIndex(e => e.name === entry.name);
  if (existingIdx >= 0) {
    if (entry.stars > all[existingIdx].stars) {
      all[existingIdx] = entry;
    }
  } else {
    all.push(entry);
  }
  // Sort by stars desc, then xp desc
  all.sort((a, b) => b.stars - a.stars || b.xp - a.xp);
  // Keep top 100
  localStorage.setItem(KEYS.leaderboard, JSON.stringify(all.slice(0, 100)));
}

// --- Daily Reward ---
export function canClaimDailyReward(): boolean {
  const p = getProfile();
  if (!p.dailyRewardLastClaimed) return true;
  const last = new Date(p.dailyRewardLastClaimed);
  const today = new Date();
  return last.toDateString() !== today.toDateString();
}

export function claimDailyReward(): { coins: number; streak: number } {
  const p = getProfile();
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Check if yesterday was claimed (streak continuation)
  let streak = p.dailyStreak;
  if (p.dailyRewardLastClaimed) {
    const last = new Date(p.dailyRewardLastClaimed);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (last.toDateString() === yesterday.toDateString()) {
      streak += 1;
    } else {
      streak = 1;
    }
  } else {
    streak = 1;
  }
  
  // Coins scale with streak (max bonus at 7 days)
  const baseCoins = 20;
  const bonus = Math.min(streak - 1, 6) * 5;
  const coinsEarned = baseCoins + bonus;
  
  p.coins += coinsEarned;
  p.totalCoins += coinsEarned;
  p.dailyRewardLastClaimed = today.toISOString();
  p.dailyStreak = streak;
  saveProfile(p);
  
  return { coins: coinsEarned, streak };
}

// --- Star Calculation ---
// par = expected good move count for this difficulty
export function calculateStars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par * 1.5) return 2;
  return 1;
}
