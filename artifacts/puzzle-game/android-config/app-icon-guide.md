# Puzzle X — App Icon & Splash Screen Guide

## App Icon Sizes (Android)

Generate all sizes from one 1024×1024 PNG master using icon.kitchen or
Android Studio Image Asset Studio.

| File path | Size |
|---|---|
| `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | 48×48 |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | 72×72 |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | 96×96 |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | 144×144 |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | 192×192 |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png` | 48×48 |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png` | 72×72 |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png` | 96×96 |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png` | 144×144 |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` | 192×192 |

Play Store requires an additional 512×512 PNG icon and a 1024×500 feature graphic.

## Puzzle X icon design

The icon matches the in-game logo in `public/favicon.svg`:

- **Background**: `#0a0814` rounded square, subtle dark-purple gradient
- **Top-left & top-right tiles**: purple gradient (`#a78bfa → #7c3aed`)
- **Bottom-left tile**: pink/red gradient (`#ec4899 → #be185d`)
- **Bottom-right**: empty slot with dashed purple border + glowing "X" letter

## Adaptive Icons (Android 8.0+)

Create `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
```

In `android/app/src/main/res/values/colors.xml` add:

```xml
<color name="ic_launcher_background">#0a0814</color>
```

## Splash Screen

The Capacitor SplashScreen plugin reads from:

```
android/app/src/main/res/drawable/splash.png          (light/default)
android/app/src/main/res/drawable-night/splash.png    (dark mode)
```

**Recommended size**: 1242×2688 px (covers all screen densities)  
**Background**: `#0a0814` — matches `capacitor.config.ts` `backgroundColor`  
**Content**: Centered Puzzle X logo + wordmark on the dark background  
**Duration**: 2000 ms fade (configured in `capacitor.config.ts`)

## Quick generation with @capacitor/assets

```bash
# 1. Place your master files:
#    assets/icon.png    — 1024×1024 px, Puzzle X icon
#    assets/splash.png  — 2732×2732 px, Puzzle X splash (logo centered)

npm install -g @capacitor/assets
npx @capacitor/assets generate \
  --iconBackgroundColor "#0a0814" \
  --iconBackgroundColorDark "#0a0814" \
  --splashBackgroundColor "#0a0814" \
  --splashBackgroundColorDark "#0a0814"
```

This auto-generates all required sizes into the Android resource directories.
