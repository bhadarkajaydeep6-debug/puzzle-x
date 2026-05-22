#!/usr/bin/env node
// ─── Puzzle X — Push to GitHub via API ───────────────────────────────────────
// Reads all source files, uploads them as blobs, creates a tree + commit,
// and force-sets the main branch — all in one script, no local git needed.
//
// Usage:
//   GH_TOKEN=xxx GH_OWNER=yyy node scripts/push-to-github.mjs

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TOKEN = process.env.GH_TOKEN;
const OWNER = process.env.GH_OWNER || "bhadarkajaydeep6-debug";
const REPO  = process.env.GH_REPO  || "puzzle-x";

if (!TOKEN) { console.error("GH_TOKEN not set"); process.exit(1); }

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const HEADERS = {
  Authorization: `token ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "User-Agent": "puzzle-x-push-script",
};

async function gh(endpoint, opts = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE}${endpoint}`;
  const r = await fetch(url, { headers: HEADERS, ...opts });
  const body = await r.json();
  if (!r.ok) throw new Error(`GitHub ${r.status} ${endpoint}: ${JSON.stringify(body).slice(0,200)}`);
  return body;
}

// ── Collect files ─────────────────────────────────────────────────────────────
const IGNORE = [
  "node_modules", ".git", ".local", ".cache", "dist",
  "android", "attached_assets",
];
const IGNORE_EXT  = [".jks", ".keystore", ".apk", ".aab"];
const IGNORE_FILE = ["pnpm-lock.yaml", ".env.production"];

function collect(dir, root = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (IGNORE.some(x => e.name === x || e.name.startsWith(x))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...collect(full, root));
    } else {
      if (IGNORE_EXT.some(x => e.name.endsWith(x))) continue;
      if (IGNORE_FILE.includes(e.name)) continue;
      files.push(path.relative(root, full));
    }
  }
  return files;
}

const ROOT = path.resolve(process.cwd());
const files = collect(ROOT);
console.log(`\n→ ${files.length} files to push\n`);

// ── Step 0: Seed empty repo via Contents API (needed before blob API works) ───
// GitHub's blob/tree API returns 409 on completely empty repos.
// Creating one file via the Contents API initialises the repo properly.
console.log("→ Seeding empty repo with initial commit…");
await gh("/contents/.gitkeep", {
  method: "PUT",
  body: JSON.stringify({
    message: "chore: initialise repository",
    content: Buffer.from("# Puzzle X\n").toString("base64"),
  }),
});

// Get the seed commit SHA so we can use it as a parent
const mainRef = await gh("/git/refs/heads/main");
const seedSha = mainRef.object.sha;
console.log(`  Seed commit SHA: ${seedSha}`);

// ── Step 1: Create blobs in batches ──────────────────────────────────────────
const BATCH = 20;
const treeItems = [];

for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  process.stdout.write(`  Uploading blobs ${i + 1}–${Math.min(i + BATCH, files.length)} / ${files.length}…`);

  await Promise.all(batch.map(async (relPath) => {
    const abs = path.join(ROOT, relPath);
    const raw = fs.readFileSync(abs);
    // Detect binary by presence of null bytes
    const isBinary = raw.indexOf(0x00) !== -1;

    const blob = await gh("/git/blobs", {
      method: "POST",
      body: JSON.stringify(
        isBinary
          ? { content: raw.toString("base64"), encoding: "base64" }
          : { content: raw.toString("utf8"),   encoding: "utf-8"  }
      ),
    });
    treeItems.push({
      path: relPath.replace(/\\/g, "/"),
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }));

  console.log(" ✓");
}

// ── Step 2: Build full tree based on seed tree ────────────────────────────────
// Get the seed commit's tree SHA so we can build on top of it
const seedCommit = await gh(`/git/commits/${seedSha}`);
console.log("\n→ Creating git tree…");
const tree = await gh("/git/trees", {
  method: "POST",
  body: JSON.stringify({
    base_tree: seedCommit.tree.sha,
    tree: treeItems,
  }),
});
console.log(`  Tree SHA: ${tree.sha}`);

// ── Step 3: Create the real commit on top of the seed ────────────────────────
console.log("→ Creating commit…");
const commit = await gh("/git/commits", {
  method: "POST",
  body: JSON.stringify({
    message: "feat: Puzzle X — initial release\n\n- 200-level sliding puzzle game\n- React + Vite + Capacitor\n- AdMob (banner, interstitial, rewarded)\n- GitHub Actions APK build (.apk + .aab)\n- 4 color themes, combo system, achievements, leaderboard\n- Cloud save, daily rewards, haptics\n- ProGuard, ABI splits, signed release build",
    tree: tree.sha,
    parents: [seedSha],
  }),
});
console.log(`  Commit SHA: ${commit.sha}`);

// ── Step 4: Fast-forward main to the real commit ──────────────────────────────
console.log("→ Updating main branch…");
await gh("/git/refs/heads/main", {
  method: "PATCH",
  body: JSON.stringify({ sha: commit.sha, force: true }),
});

console.log(`\n✓  Pushed ${files.length} files to https://github.com/${OWNER}/${REPO}\n`);
console.log(`   GitHub Actions will now build the APK automatically.`);
console.log(`   Track: https://github.com/${OWNER}/${REPO}/actions\n`);
console.log(`   Repo:  https://github.com/${OWNER}/${REPO}\n`);
