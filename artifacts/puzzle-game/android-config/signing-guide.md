# Puzzle X — Signing & Play Store Release Guide

## Quick start (debug APK for testing)

```bash
cd artifacts/puzzle-game
npx cap add android          # first time only
bash android-config/apply-android-config.sh
bash android-config/build-android.sh   # choose option 1
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Signed release (sideload or Play Store)

### 1. Create a keystore (ONE TIME — never lose this file)

```bash
keytool -genkey -v \
  -keystore puzzle-x-release.jks \
  -alias puzzlex \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store `puzzle-x-release.jks` in a **safe location outside your repository**.
If you lose it, you can never update your Play Store app.

### 2. Configure gradle signing

Open `android/app/build.gradle` and replace the `signingConfigs` block:

```groovy
signingConfigs {
    release {
        storeFile file("../../puzzle-x-release.jks")   // adjust path if needed
        storePassword System.getenv("KEYSTORE_PASS") ?: "YOUR_STORE_PASSWORD"
        keyAlias "puzzlex"
        keyPassword System.getenv("KEY_PASS") ?: "YOUR_KEY_PASSWORD"
    }
}
```

Or use the provided template `android-config/app-build.gradle.template` which
reads from environment variables (recommended for CI).

### 3. Build signed APK

```bash
export KEYSTORE_FILE="puzzle-x-release.jks"
export KEYSTORE_PASS="your_store_password"
export KEY_ALIAS="puzzlex"
export KEY_PASS="your_key_password"

cd android && ./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### 4. Build release AAB (for Play Store)

```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## GitHub Actions (automatic APK on every push)

See `.github/workflows/build-android.yml`.

Add these secrets to your GitHub repo (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -i puzzle-x-release.jks \| pbcopy` (macOS) |
| `KEYSTORE_PASS` | Your keystore password |
| `KEY_ALIAS` | `puzzlex` |
| `KEY_PASS` | Your key password |

Every push to `main` will produce a signed APK as a downloadable artifact.

---

## Replace AdMob test IDs before publishing

| File | What to change |
|---|---|
| `capacitor.config.ts` → `AdMob.appId.android` | Real `ca-app-pub-XXXXX~YYYYY` |
| `src/lib/nativeAdManager.ts` → `PROD_IDS.banner` | Real banner unit ID |
| `src/lib/nativeAdManager.ts` → `PROD_IDS.interstitial` | Real interstitial unit ID |
| `src/lib/nativeAdManager.ts` → `PROD_IDS.rewarded` | Real rewarded unit ID |
| `android/app/src/main/AndroidManifest.xml` → `APPLICATION_ID` meta-data | Real app ID |
| `capacitor.config.ts` → `AdMob.initializeForTesting` | Set `false` |

---

## Upload to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app → Category: Games → Puzzle
3. Production → Releases → Create release
4. Upload `app-release.aab`
5. Fill in store listing (title: **Puzzle X**, short description, screenshots)
6. Set content rating (Everyone — suitable for all ages)
7. Submit for review (typically 1–3 business days)

---

## APK size optimisation

The build is already configured for minimum APK size:

- **ABI splits** — separate APKs per CPU architecture (~40% smaller per device)
- **Resource shrinking** — unused drawables/layouts removed
- **ProGuard/R8** — code minification + dead code removal
- **Vite chunk splitting** — vendor/motion/ui chunks load lazily
- **No base64 inlining** — assets kept as separate files
- **terser minification** — JS compressed to minimum

Typical APK sizes after optimisation:
- arm64-v8a APK: **~8–12 MB**
- Universal APK:  **~18–22 MB**
