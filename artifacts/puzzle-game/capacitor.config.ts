import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // ─── App identity ────────────────────────────────────────────────────────
  appId: "com.puzzlex.game",
  appName: "Puzzle X",

  // ─── Web asset directory ─────────────────────────────────────────────────
  // Points at the Vite output when built with vite.android.config.ts
  webDir: "dist",

  // ─── Server (dev only) ───────────────────────────────────────────────────
  // Remove this block before building a release APK/AAB
  server: {
    // Uncomment and set your Replit dev URL to live-reload on device:
    // url: "https://YOUR-REPL.replit.dev/puzzle-game",
    // cleartext: true,
    androidScheme: "https",
  },

  // ─── Android-specific config ─────────────────────────────────────────────
  android: {
    // Keeps WebView hardware-accelerated for smooth animations
    allowMixedContent: false,
    // Back-button handling is done in JS (see src/lib/nativeAdManager.ts)
    captureInput: false,
    // Let system handle keyboard resize so the puzzle board isn't squished
    windowSoftInputMode: "adjustResize",
  },

  // ─── Plugin configuration ─────────────────────────────────────────────────
  plugins: {
    // ── Splash Screen ────────────────────────────────────────────────────────
    // Place splash.png (1242×2688) and splash-dark.png in android/app/src/main/res/drawable/
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0814",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // ── Status Bar ───────────────────────────────────────────────────────────
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0814",
      overlaysWebView: false,
    },

    // ── AdMob ────────────────────────────────────────────────────────────────
    // Replace ADMOB_APP_ID with your real ca-app-pub-XXXXX~YYYYY value
    // (from https://apps.admob.com → Apps → App settings → App ID)
    // AdMob label: "Puzzle X"
    AdMob: {
      appId: {
        android: "ca-app-pub-3940256099942544~3347511713",  // ← TEST app ID — replace for production
      },
      initializeForTesting: true,
      testingDevices: [],
    },
  },
};

export default config;
