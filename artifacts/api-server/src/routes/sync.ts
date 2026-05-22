// Cloud save / sync routes for the puzzle game.
// These endpoints let the frontend save and load player progress to the database.
// Authentication is intentionally simple — the player_id UUID acts as the key.
// No login required: share your player_id to sync across devices.

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cloudSavesTable, CloudSavePayloadSchema } from "@workspace/db";

const router: IRouter = Router();

// ── GET /api/sync/load/:playerId ─────────────────────────────────────────────
// Load a player's cloud save by their player_id (UUID).
// Returns 404 if this player has never synced to the cloud.
router.get("/sync/load/:playerId", async (req, res): Promise<void> => {
  // Validate the player_id format (must be a UUID)
  const raw = Array.isArray(req.params.playerId)
    ? req.params.playerId[0]
    : req.params.playerId;

  if (!raw || !/^[0-9a-f-]{36}$/.test(raw)) {
    res.status(400).json({ error: "Invalid player ID format" });
    return;
  }

  // Look up the player's save in the database
  const [row] = await db
    .select()
    .from(cloudSavesTable)
    .where(eq(cloudSavesTable.playerId, raw));

  if (!row) {
    // No cloud save found — client should use local data
    res.status(404).json({ error: "No cloud save found for this player" });
    return;
  }

  req.log.info({ playerId: raw }, "Cloud save loaded");

  res.json({
    playerId: row.playerId,
    saveData: row.saveData,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
});

// ── POST /api/sync/save ──────────────────────────────────────────────────────
// Save (or update) a player's cloud save.
// The client sends their player_id + the full save payload.
// Conflict resolution: server keeps whichever save has the NEWER updatedAt.
// The client can force-overwrite by passing forceOverwrite: true.
router.post("/sync/save", async (req, res): Promise<void> => {
  const { playerId, saveData, forceOverwrite = false } = req.body as {
    playerId: unknown;
    saveData: unknown;
    forceOverwrite?: boolean;
  };

  // Validate player ID
  if (
    typeof playerId !== "string" ||
    !/^[0-9a-f-]{36}$/.test(playerId)
  ) {
    res.status(400).json({ error: "Invalid player ID format" });
    return;
  }

  // Validate the save data structure
  const parsed = CloudSavePayloadSchema.safeParse(saveData);
  if (!parsed.success) {
    req.log.warn({ error: parsed.error.message }, "Invalid save data");
    res.status(400).json({ error: "Invalid save data", details: parsed.error.message });
    return;
  }

  const payload = parsed.data;

  // Check for an existing cloud save
  const [existing] = await db
    .select()
    .from(cloudSavesTable)
    .where(eq(cloudSavesTable.playerId, playerId));

  if (existing && !forceOverwrite) {
    // Conflict resolution: keep the newer save based on updatedAt timestamp
    const existingTime = new Date(existing.updatedAt).getTime();
    const incomingTime = new Date(payload.updatedAt).getTime();

    if (existingTime > incomingTime) {
      // Server has a NEWER save — reject this upload and tell the client to sync down
      req.log.info({ playerId }, "Conflict: server save is newer, rejecting upload");
      res.status(409).json({
        error: "conflict",
        message: "Server has a newer save. Load the cloud save or use forceOverwrite.",
        serverUpdatedAt: existing.updatedAt.toISOString(),
        clientUpdatedAt: payload.updatedAt,
      });
      return;
    }
  }

  // Upsert: insert or replace the existing row
  await db
    .insert(cloudSavesTable)
    .values({
      playerId,
      saveData: payload,
      version: payload.version,
    })
    .onConflictDoUpdate({
      target: cloudSavesTable.playerId,
      set: {
        saveData: payload,
        version: payload.version,
        updatedAt: new Date(),
      },
    });

  req.log.info({ playerId }, "Cloud save stored");

  res.status(200).json({
    success: true,
    updatedAt: new Date().toISOString(),
  });
});

// ── DELETE /api/sync/delete/:playerId ────────────────────────────────────────
// Delete a player's cloud save (used by "Reset Progress" in Settings).
router.delete("/sync/delete/:playerId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.playerId)
    ? req.params.playerId[0]
    : req.params.playerId;

  if (!raw || !/^[0-9a-f-]{36}$/.test(raw)) {
    res.status(400).json({ error: "Invalid player ID format" });
    return;
  }

  await db
    .delete(cloudSavesTable)
    .where(eq(cloudSavesTable.playerId, raw));

  req.log.info({ playerId: raw }, "Cloud save deleted");
  res.sendStatus(204);
});

export default router;
