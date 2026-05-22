// ─── Puzzle X — Android / Capacitor Build Config ─────────────────────────────
// Used exclusively when building web assets for the Android APK/AAB.
// Run via:  pnpm run build:android
//
// Differences from vite.config.ts (the web dev build):
//  • base is './' — all asset URLs must be relative (Capacitor file:// WebView)
//  • outDir is 'dist' — matches webDir in capacitor.config.ts
//  • No PORT / BASE_PATH env var requirement
//  • Strips Replit-only dev plugins (cartographer, banner, error modal)
//  • Terser minification with aggressive options for smallest possible bundle
//  • Manual chunks — vendor/motion/ui load lazily after first frame
//  • assetsInlineLimit 2048 — avoids large base64 blobs inflating the JS
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "./",

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,

    // ── Compatibility ─────────────────────────────────────────────────────────
    // Android 6+ (API 23+) WebView supports ES2020 natively.
    // Targeting es2020 keeps the bundle small (no unnecessary transforms).
    target: "es2020",

    // ── Minification ──────────────────────────────────────────────────────────
    minify: "terser",
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true,         // strip console.log in release
        drop_debugger: true,
        pure_funcs: [
          "console.log",
          "console.info",
          "console.debug",
          "console.warn",
        ],
        passes: 2,                   // two compression passes for extra savings
        ecma: 2020,
      },
      format: {
        comments: false,             // strip all comments
        ecma: 2020,
      },
      mangle: {
        safari10: false,
      },
    },

    // ── Chunk splitting ───────────────────────────────────────────────────────
    // Splitting keeps the initial JS chunk <200 KB so the first frame is fast.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — always needed on first load
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/")) {
            return "vendor";
          }
          // Framer Motion — needed once the UI mounts
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }
          // UI utilities — loaded after first render
          if (id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/wouter") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/class-variance-authority")) {
            return "ui";
          }
          // Radix UI
          if (id.includes("node_modules/@radix-ui")) {
            return "radix";
          }
        },
        // Stable chunk file names for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },

    // ── Asset inlining ────────────────────────────────────────────────────────
    // Keep small assets (SVG icons etc.) inlined; larger ones as separate files.
    assetsInlineLimit: 2048,

    // ── Source maps ───────────────────────────────────────────────────────────
    // Disable source maps in release to keep APK size down and avoid exposing
    // source. Enable temporarily to debug a crash:  sourcemap: 'hidden'
    sourcemap: false,

    // ── Chunk size warning ────────────────────────────────────────────────────
    chunkSizeWarningLimit: 600,
  },
});
