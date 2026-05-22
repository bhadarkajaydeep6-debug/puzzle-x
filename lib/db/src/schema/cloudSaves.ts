// Cloud save table — stores each player's complete game state as JSON.
// One row per player (identified by their UUID player_id).
// The full save is a single JSONB blob for fast reads and easy versioning.

import { pgTable, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ---- Zod schemas for the JSON save data structure ----
// These are shared between the API server and act as the contract.

export const LevelProgressSchema = z.object({
  stars: z.number().int().min(0).max(3),
  bestMoves: z.number().int().min(0),
  bestTime: z.number().int().min(0),
  coins: z.number().int().min(0),
});

export const PlayerProfileSchema = z.object({
  name: z.string().max(32),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  coins: z.number().int().min(0),
  totalCoins: z.number().int().min(0),
  dailyRewardLastClaimed: z.string(),
  dailyStreak: z.number().int().min(0),
});

export const GameSettingsSchema = z.object({
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
});

export const AchievementSchema = z.object({
  id: z.string(),
  unlocked: z.boolean(),
  unlockedAt: z.string().optional(),
});

// The complete cloud save payload
export const CloudSavePayloadSchema = z.object({
  // Schema version — bump this when the shape changes
  version: z.number().int().min(1).default(1),
  // ISO timestamp set by the client at save time
  updatedAt: z.string(),
  profile: PlayerProfileSchema,
  // level number (1-200) → progress
  progress: z.record(z.string(), LevelProgressSchema),
  settings: GameSettingsSchema,
  achievements: z.record(z.string(), AchievementSchema),
});

export type CloudSavePayload = z.infer<typeof CloudSavePayloadSchema>;

// ---- Drizzle table ----

export const cloudSavesTable = pgTable("cloud_saves", {
  // UUID generated on the client — acts as the "guest account" key
  playerId: text("player_id").primaryKey(),
  // The entire save state stored as a JSONB blob
  saveData: jsonb("save_data").notNull(),
  // Payload schema version (for future migrations)
  version: integer("version").notNull().default(1),
  // Server-side timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCloudSaveSchema = createInsertSchema(cloudSavesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertCloudSave = z.infer<typeof insertCloudSaveSchema>;
export type CloudSave = typeof cloudSavesTable.$inferSelect;
