// ─── Cloud Sync Manager ────────────────────────────────────────────────────
// Handles saving and loading player progress to/from the cloud (API server).
// Local storage is always kept as the primary copy and offline fallback.
//
// How cross-device sync works:
//   1. Each device gets a UUID "player ID" stored in localStorage.
//   2. That UUID is the cloud key — no account or password needed.
//   3. To play on a new device, enter the same player ID in Settings.
//   4. The cloud always keeps the NEWER save (based on timestamp).
//
// Sync flow:
//   On startup  → try to load cloud save, merge if newer
//   On level win → auto-save to cloud
//   On settings "Backup Now" → manual force-save

import {
  getProfile,
  getAllProgress,
  getSettings,
  getAchievements,
  saveProfile,
  saveSettings,
  saveLevelProgress,
  unlockAchievement,
  type PlayerProfile,
  type GameSettings,
  type LevelProgress,
  type Achievement,
} from "./gameStore";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CloudSavePayload {
  version: number;
  updatedAt: string;
  profile: PlayerProfile;
  progress: Record<string, LevelProgress>;
  settings: GameSettings;
  achievements: Record<string, Achievement>;
}

export type SyncStatus =
  | "idle"
  | "syncing"
  | "success"
  | "error"
  | "conflict"
  | "offline";

// ── Constants ──────────────────────────────────────────────────────────────

const CURRENT_VERSION = 1;
const PLAYER_ID_KEY = "pz_player_id";
const LAST_SYNC_KEY = "pz_last_sync";
const SYNC_BASE_URL = "/api/sync";

// Max times to retry a failed save before giving up
const MAX_RETRIES = 3;
// Delay between retries (ms) — doubles each attempt (exponential backoff)
const BASE_RETRY_DELAY_MS = 1000;

// ── Player ID (Guest Account) ──────────────────────────────────────────────

/** Get or create the unique player ID for this device */
export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    // Generate a new UUID v4
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

/** Replace the player ID (used when entering a sync code from another device) */
export function setPlayerId(newId: string): void {
  localStorage.setItem(PLAYER_ID_KEY, newId);
}

/** Get the timestamp of the last successful sync */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

function setLastSyncTime(iso: string): void {
  localStorage.setItem(LAST_SYNC_KEY, iso);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Is the browser currently online? */
function isOnline(): boolean {
  return navigator.onLine;
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build the full save payload from current localStorage state */
export function buildSavePayload(): CloudSavePayload {
  return {
    version: CURRENT_VERSION,
    updatedAt: new Date().toISOString(),
    profile: getProfile(),
    progress: getAllProgress() as Record<string, LevelProgress>,
    settings: getSettings(),
    achievements: getAchievements(),
  };
}

/** Apply a cloud save payload to local storage */
function applySavePayload(payload: CloudSavePayload): void {
  // Profile
  saveProfile(payload.profile);
  // Settings
  saveSettings(payload.settings);
  // Level progress (merge — keep local entries that cloud doesn't have)
  const localProgress = getAllProgress();
  const merged = { ...localProgress };
  for (const [levelStr, prog] of Object.entries(payload.progress)) {
    const levelNum = parseInt(levelStr, 10);
    const local = merged[levelNum];
    // Cloud wins if it has more stars or cloud entry doesn't exist locally
    if (!local || prog.stars > local.stars) {
      merged[levelNum] = prog;
    }
  }
  for (const [levelStr, prog] of Object.entries(merged)) {
    saveLevelProgress(parseInt(levelStr, 10), prog);
  }
  // Achievements (union — never un-unlock)
  const localAchievements = getAchievements();
  for (const [id, ach] of Object.entries(payload.achievements)) {
    if (ach.unlocked && !localAchievements[id]?.unlocked) {
      unlockAchievement(id);
    }
  }
}

// ── API calls ──────────────────────────────────────────────────────────────

/** Load cloud save for a given player ID */
async function fetchCloudSave(
  playerId: string
): Promise<{ payload: CloudSavePayload; serverUpdatedAt: string } | null> {
  const response = await fetch(`${SYNC_BASE_URL}/load/${playerId}`);
  if (response.status === 404) return null; // No cloud save yet
  if (!response.ok) throw new Error(`Load failed: ${response.status}`);
  const data = await response.json() as {
    saveData: CloudSavePayload;
    updatedAt: string;
  };
  return { payload: data.saveData, serverUpdatedAt: data.updatedAt };
}

/** Push local save to the cloud, with retry on failure */
async function pushCloudSave(
  playerId: string,
  payload: CloudSavePayload,
  forceOverwrite = false
): Promise<{ success: true } | { conflict: true; serverUpdatedAt: string }> {
  const response = await fetch(`${SYNC_BASE_URL}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, saveData: payload, forceOverwrite }),
  });

  if (response.status === 409) {
    const data = await response.json() as { serverUpdatedAt: string };
    return { conflict: true, serverUpdatedAt: data.serverUpdatedAt };
  }

  if (!response.ok) throw new Error(`Save failed: ${response.status}`);
  return { success: true };
}

/** Delete cloud save for a player (used on reset progress) */
export async function deleteCloudSave(playerId: string): Promise<void> {
  if (!isOnline()) return;
  await fetch(`${SYNC_BASE_URL}/delete/${playerId}`, { method: "DELETE" });
}

// ── Main Sync Functions ────────────────────────────────────────────────────

/**
 * Load and merge cloud save on app startup.
 * - If cloud save is NEWER than local: apply cloud data
 * - If local is NEWER: keep local (cloud will be updated on next save)
 * - If offline: skip silently, use local data
 * Returns the sync status for the UI to display.
 */
export async function loadCloudSave(): Promise<SyncStatus> {
  if (!isOnline()) return "offline";

  const playerId = getPlayerId();

  try {
    const result = await fetchCloudSave(playerId);
    if (!result) return "idle"; // No cloud save exists yet

    const { payload, serverUpdatedAt } = result;
    const localUpdatedAt = getProfile()
      ? new Date(getLastSyncTime() ?? 0).getTime()
      : 0;
    const cloudTime = new Date(serverUpdatedAt).getTime();

    // Cloud is newer — apply it to local storage
    if (cloudTime > localUpdatedAt) {
      applySavePayload(payload);
      setLastSyncTime(serverUpdatedAt);
    }

    return "success";
  } catch (err) {
    // Network error — silently fall back to local save
    return "error";
  }
}

/**
 * Save the current local state to the cloud with exponential backoff retry.
 * - Automatically retries up to MAX_RETRIES times on network error
 * - On conflict (server is newer): load server data, then re-save merged result
 * - If offline: silently skip (local save is always written first)
 * Returns the final sync status.
 */
export async function saveCloudSave(
  forceOverwrite = false
): Promise<SyncStatus> {
  if (!isOnline()) return "offline";

  const playerId = getPlayerId();
  const payload = buildSavePayload();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await pushCloudSave(playerId, payload, forceOverwrite);

      if ("conflict" in result) {
        // Server has a newer save — load it, merge, then push the merged result
        const cloudResult = await fetchCloudSave(playerId);
        if (cloudResult) {
          applySavePayload(cloudResult.payload);
          setLastSyncTime(cloudResult.serverUpdatedAt);
          // Now re-save the merged (current) state with force
          await pushCloudSave(playerId, buildSavePayload(), true);
        }
        return "conflict";
      }

      // Success
      setLastSyncTime(payload.updatedAt);
      return "success";
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s...
        await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }

  return "error"; // All retries exhausted
}

/**
 * Full sync: load cloud first, then push local.
 * Used for manual "Sync Now" button and when changing player ID.
 */
export async function fullSync(): Promise<SyncStatus> {
  if (!isOnline()) return "offline";

  // Step 1: load cloud (applies newer data if cloud is newer)
  const loadStatus = await loadCloudSave();
  if (loadStatus === "error") return "error";

  // Step 2: push local (which now includes merged data)
  return saveCloudSave(true);
}
