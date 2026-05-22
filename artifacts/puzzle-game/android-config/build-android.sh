#!/usr/bin/env bash
# ─── Puzzle X — Android Build Script ─────────────────────────────────────────
# Run this on your LOCAL machine where Android SDK is installed.
# OR: push to GitHub and let the Actions workflow build it automatically.
#
# PREREQUISITES (local):
#   • Node.js 18+ and pnpm installed
#   • Java 17+ (JDK): https://adoptium.net/
#   • Android Studio installed: https://developer.android.com/studio
#   • Android SDK API 34+ via Android Studio → SDK Manager
#   • ANDROID_HOME env var set (Android Studio sets this automatically)
#   • ANDROID_SDK_ROOT optionally set (same value as ANDROID_HOME)
#
# FIRST-TIME SETUP:
#   1. Download this project from Replit (Shell → Download as ZIP)
#   2. Unzip and open a terminal in the project root (where pnpm-workspace.yaml is)
#   3. Run:  pnpm install
#   4. cd artifacts/puzzle-game
#   5. Run:  npx cap add android        ← only needed once
#   6. Run:  bash android-config/apply-android-config.sh
#   7. Run:  bash android-config/build-android.sh
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$SCRIPT_DIR/.."
cd "$GAME_DIR"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       Puzzle X — Android Build           ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisite checks ───────────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗  '$1' not found. $2${NC}"
    exit 1
  fi
}
check_cmd node  "Install Node.js 18+ from https://nodejs.org"
check_cmd pnpm  "Install pnpm: npm install -g pnpm"
check_cmd java  "Install JDK 17+ from https://adoptium.net"

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  echo -e "${RED}✗  ANDROID_HOME is not set.${NC}"
  echo "   Set it to your Android SDK location, e.g.:"
  echo "   export ANDROID_HOME=\$HOME/Android/Sdk   # Linux"
  echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk  # macOS"
  exit 1
fi

echo -e "${GREEN}✓  Prerequisites OK${NC}"
echo ""

# ── Step 1: Install workspace dependencies ────────────────────────────────────
echo "→ Installing pnpm workspace dependencies…"
cd "$GAME_DIR/../.."
pnpm install --frozen-lockfile
cd "$GAME_DIR"

# ── Step 2: Build web assets for Android ─────────────────────────────────────
echo "→ Building optimised web assets (vite.android.config.ts)…"
pnpm run build:android
echo -e "${GREEN}✓  Web assets built → dist/${NC}"

# ── Step 3: Add Android platform if not already present ──────────────────────
if [ ! -d "android" ]; then
  echo "→ Adding Android platform (first time)…"
  npx cap add android
  echo "→ Applying Puzzle X Android config patches…"
  bash android-config/apply-android-config.sh
fi

# ── Step 4: Sync web assets into Android project ─────────────────────────────
echo "→ Syncing web assets into Android project…"
npx cap sync android
echo -e "${GREEN}✓  Synced${NC}"

echo ""
echo -e "${BOLD}What would you like to build?${NC}"
echo "  1) Debug APK         (fast, unsigned — sideload / ADB install)"
echo "  2) Release APK       (signed — share directly or sideload)"
echo "  3) Release AAB       (signed — upload to Google Play Store)"
echo "  4) Open Android Studio (build or debug manually)"
echo ""
read -rp "Choice [1-4]: " CHOICE

case "$CHOICE" in
  1)
    echo ""
    echo "→ Building Debug APK…"
    cd android && ./gradlew assembleDebug --daemon
    APK="app/build/outputs/apk/debug/app-debug.apk"
    SIZE=$(du -sh "$APK" 2>/dev/null | cut -f1)
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓  Debug APK ready ($SIZE)              ${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo "   Path:  android/$APK"
    echo ""
    echo "   Install on connected device:"
    echo "   adb install android/$APK"
    echo ""
    echo "   Or copy the APK to your phone and open it."
    ;;
  2)
    echo ""
    if [ ! -f "puzzle-x-release.jks" ]; then
      echo -e "${CYAN}→ No keystore found. Creating one…${NC}"
      read -rp "  Enter keystore password: " STORE_PASS
      read -rp "  Enter key alias (e.g. puzzlex): " KEY_ALIAS
      read -rp "  Enter key password: " KEY_PASS
      keytool -genkey -v \
        -keystore puzzle-x-release.jks \
        -alias "$KEY_ALIAS" \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
        -dname "CN=Puzzle X, OU=Games, O=PuzzleX, L=Unknown, S=Unknown, C=US"
      echo -e "${GREEN}✓  Keystore created: puzzle-x-release.jks${NC}"
      echo -e "${RED}   IMPORTANT: Back up this file — it cannot be recovered!${NC}"
      export KEYSTORE_FILE="puzzle-x-release.jks"
      export KEYSTORE_PASS="$STORE_PASS"
      export KEY_ALIAS_NAME="$KEY_ALIAS"
      export KEY_PASS_VAL="$KEY_PASS"
    fi

    echo "→ Building Release APK…"
    cd android
    KEYSTORE_PASS="${KEYSTORE_PASS:-$STORE_PASS}" \
    KEY_PASS="${KEY_PASS_VAL:-$KEY_PASS}" \
    ./gradlew assembleRelease --daemon

    APK="app/build/outputs/apk/release/app-release.apk"
    SIZE=$(du -sh "$APK" 2>/dev/null | cut -f1)
    echo ""
    echo -e "${GREEN}✓  Release APK ready ($SIZE): android/$APK${NC}"
    ;;
  3)
    echo ""
    if [ ! -f "puzzle-x-release.jks" ]; then
      echo "No keystore found. Please create one first (choice 2) or set:"
      echo "  KEYSTORE_FILE, KEYSTORE_PASS, KEY_ALIAS_NAME, KEY_PASS"
      exit 1
    fi
    echo "→ Building Release AAB for Play Store…"
    cd android
    ./gradlew bundleRelease --daemon
    AAB="app/build/outputs/bundle/release/app-release.aab"
    SIZE=$(du -sh "$AAB" 2>/dev/null | cut -f1)
    echo ""
    echo -e "${GREEN}✓  Release AAB ready ($SIZE): android/$AAB${NC}"
    echo ""
    echo "   Upload to: https://play.google.com/console"
    ;;
  4)
    echo "→ Opening Android Studio…"
    npx cap open android
    ;;
  *)
    echo -e "${RED}✗  Invalid choice.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BOLD}${GREEN}Done!${NC}"
