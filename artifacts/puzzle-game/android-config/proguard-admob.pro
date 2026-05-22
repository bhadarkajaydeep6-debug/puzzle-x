# ─── Puzzle X — ProGuard Rules ────────────────────────────────────────────────
# Append to: android/app/proguard-rules.pro
# ─────────────────────────────────────────────────────────────────────────────

# ── AdMob / Google Mobile Ads ─────────────────────────────────────────────────
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.ads.** { *; }
-dontwarn com.google.android.gms.**

# ── Capacitor core bridge ─────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}

# ── Capacitor AdMob plugin ────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.admob.** { *; }
-dontwarn com.capacitorjs.plugins.admob.**

# ── Capacitor Haptics ─────────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.haptics.** { *; }

# ── Capacitor SplashScreen ────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.splashscreen.** { *; }

# ── Capacitor Network ─────────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.network.** { *; }

# ── Capacitor StatusBar ───────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.statusbar.** { *; }

# ── WebView JavaScript bridge ─────────────────────────────────────────────────
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Keep R classes ────────────────────────────────────────────────────────────
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ── Prevent stripping serialisation classes ───────────────────────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# ── Remove logging in release builds ─────────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
