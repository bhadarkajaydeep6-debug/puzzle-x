#!/usr/bin/env bash
# ─── Puzzle X — Apply Android Config Patches ─────────────────────────────────
# Run this ONCE after `npx cap add android` to patch the generated Android
# project with the correct Puzzle X configuration.
#
# Usage:
#   cd artifacts/puzzle-game
#   npx cap add android        # first time only
#   bash android-config/apply-android-config.sh
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$SCRIPT_DIR/.."
ANDROID_DIR="$GAME_DIR/android"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

if [ ! -d "$ANDROID_DIR" ]; then
  echo -e "${RED}✗  android/ not found. Run:  npx cap add android${NC}"
  exit 1
fi

echo "→ Patching strings.xml (app name)…"
cat > "$ANDROID_DIR/app/src/main/res/values/strings.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Puzzle X</string>
    <string name="title_activity_main">Puzzle X</string>
    <string name="package_name">com.puzzlex.game</string>
    <string name="custom_url_scheme">com.puzzlex.game</string>
</resources>
EOF
echo -e "${GREEN}  ✓  strings.xml updated${NC}"

echo "→ Copying network_security_config.xml…"
mkdir -p "$ANDROID_DIR/app/src/main/res/xml"
cp "$SCRIPT_DIR/network_security_config.xml" \
   "$ANDROID_DIR/app/src/main/res/xml/network_security_config.xml"
echo -e "${GREEN}  ✓  network_security_config.xml copied${NC}"

echo "→ Patching AndroidManifest.xml…"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

# Add INTERNET permission (may already exist, idempotent)
if ! grep -q "android.permission.INTERNET" "$MANIFEST"; then
  sed -i 's|<manifest |<manifest \n    <uses-permission android:name="android.permission.INTERNET" />\n    |' "$MANIFEST"
fi

# Add AD_ID permission for AdMob
if ! grep -q "com.google.android.gms.permission.AD_ID" "$MANIFEST"; then
  sed -i 's|<application|<uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n    <uses-permission android:name="android.permission.VIBRATE" />\n    <application|' "$MANIFEST"
fi

# Add AdMob Application ID meta-data
if ! grep -q "com.google.android.gms.ads.APPLICATION_ID" "$MANIFEST"; then
  sed -i 's|</application>|    <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="ca-app-pub-3940256099942544~3347511713" />\n    </application>|' "$MANIFEST"
fi

# Set portrait orientation on the activity
sed -i 's|android:name=".MainActivity"|android:name=".MainActivity"\n            android:screenOrientation="portrait"|' "$MANIFEST"

echo -e "${GREEN}  ✓  AndroidManifest.xml patched${NC}"

echo "→ Appending ProGuard rules for AdMob…"
cat "$SCRIPT_DIR/proguard-admob.pro" >> "$ANDROID_DIR/app/proguard-rules.pro"
echo -e "${GREEN}  ✓  proguard-rules.pro updated${NC}"

echo "→ Patching app/build.gradle (minSdk, signing, splits)…"
GRADLE="$ANDROID_DIR/app/build.gradle"

# Bump minSdk to 23 (Android 6.0) — required by AdMob
sed -i 's/minSdkVersion [0-9]*/minSdkVersion 23/' "$GRADLE"

# Enable ABI splits to reduce APK size
if ! grep -q "splits {" "$GRADLE"; then
  cat >> "$GRADLE" << 'SPLITS'

android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
            universalApk true
        }
    }
}
SPLITS
fi

echo -e "${GREEN}  ✓  app/build.gradle patched${NC}"

echo ""
echo -e "${GREEN}✓  All patches applied. Ready to build:${NC}"
echo "   bash android-config/build-android.sh"
