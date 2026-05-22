// ─── BannerAd ────────────────────────────────────────────────────────────────
// Unified banner ad component.
//
// • On Android (native)  → calls @capacitor-community/admob showBanner()
//                          which renders a real AdMob BannerView BELOW the WebView.
//                          The component itself renders nothing (the native view
//                          sits underneath), but it manages the plugin lifecycle.
//
// • In browser / web     → shows a styled placeholder (or real Google AdSense
//                          if adClient + adSlot props are passed).
//
// To use real AdSense on web:
//   1. Add your AdSense script to index.html <head>
//   2. Pass adClient="ca-pub-XXXXXXXX" adSlot="YYYYYYY" as props

import { useEffect, useRef } from "react";
import { IS_NATIVE, showNativeBanner, removeNativeBanner } from "@/lib/nativeAdManager";

interface BannerAdProps {
  adClient?: string;
  adSlot?: string;
  className?: string;
}

export function BannerAd({ adClient, adSlot, className = "" }: BannerAdProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (IS_NATIVE) {
      // Show a real AdMob banner anchored at the bottom of the screen
      showNativeBanner().catch(() => {});
      return () => {
        removeNativeBanner().catch(() => {});
      };
    }

    // Web: push AdSense slot if credentials were provided
    if (adClient && adSlot && insRef.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {
        // AdSense not loaded — placeholder shows instead
      }
    }
    return undefined;
  }, [adClient, adSlot]);

  // On native the real banner renders as a native view below the WebView —
  // we just need a spacer so the game content isn't hidden behind it.
  if (IS_NATIVE) {
    return (
      <div
        className={`w-full h-[60px] flex-shrink-0 ${className}`}
        data-testid="banner-ad-native-spacer"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`w-full h-[60px] flex items-center justify-center overflow-hidden ${className}`}
      data-testid="banner-ad"
      aria-label="Advertisement"
    >
      {adClient && adSlot ? (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "60px" }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      ) : (
        <div className="w-full h-full bg-card/80 border-t border-border flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">AD</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">Try Puzzle Pro</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">500+ Levels · Free Download</p>
            </div>
          </div>
          <div className="ml-auto mr-3 px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Install</span>
          </div>
        </div>
      )}
    </div>
  );
}
