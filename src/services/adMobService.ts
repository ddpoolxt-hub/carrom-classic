/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AdMob Monetization Architecture
 * Prepares the application for Google AdMob integration via Android WebView,
 * Capacitor Google Mobile Ads plugin, or native Android Java/Kotlin wrapper.
 */

// Interface for native Android AdMob bridge if injected by WebView
declare global {
  interface Window {
    AndroidAdMobBridge?: {
      showBanner: () => void;
      hideBanner: () => void;
      showRewardedAd: (rewardType: string) => void;
      isRewardedLoaded: () => boolean;
    };
  }
}

export type CosmeticReward = 'gold_champion' | 'neon_emerald' | 'powder_boost';

class AdMobService {
  private unlockedCosmetics: Set<string> = new Set(['classic_ivory', 'royal_ruby']);
  private bannerEnabled: boolean = true;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadUnlockedCosmetics();
  }

  private loadUnlockedCosmetics() {
    try {
      const saved = localStorage.getItem('carrom_unlocked_skins');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((skin) => this.unlockedCosmetics.add(skin));
        }
      }
    } catch {
      // LocalStorage unavailable
    }
  }

  private saveUnlockedCosmetics() {
    try {
      localStorage.setItem(
        'carrom_unlocked_skins',
        JSON.stringify(Array.from(this.unlockedCosmetics))
      );
    } catch {
      // LocalStorage unavailable
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public isCosmeticUnlocked(skinId: string): boolean {
    return this.unlockedCosmetics.has(skinId);
  }

  public grantReward(reward: CosmeticReward) {
    this.unlockedCosmetics.add(reward);
    this.saveUnlockedCosmetics();
    this.notify();
  }

  public isNativeBridgeAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidAdMobBridge;
  }

  public showBanner() {
    this.bannerEnabled = true;
    if (this.isNativeBridgeAvailable()) {
      window.AndroidAdMobBridge!.showBanner();
    }
    this.notify();
  }

  public hideBanner() {
    this.bannerEnabled = false;
    if (this.isNativeBridgeAvailable()) {
      window.AndroidAdMobBridge!.hideBanner();
    }
    this.notify();
  }

  public isBannerEnabled(): boolean {
    return this.bannerEnabled;
  }
}

export const adMobService = new AdMobService();
