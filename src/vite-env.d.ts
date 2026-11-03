/// <reference types="vite/client" />

interface LemonSqueezyAffiliateConfig {
  store: string;
  debug?: boolean;
  trackOnLoad?: boolean;
  onReady?: (api: { Track: (code: string) => void }) => void;
  onTrack?: (event: unknown) => void;
}

interface Window {
  lemonSqueezyAffiliateConfig?: LemonSqueezyAffiliateConfig;
  createLemonSqueezy?: () => void;
  LemonSqueezy?: {
    Setup?: (opts?: unknown) => void;
    Refresh?: () => void;
    Url?: {
      Open: (url: string) => void;
      Close: () => void;
      Build?: (url: string) => string;
    };
    Affiliate?: {
      GetID?: () => string | null;
      GetId?: () => string | null;
      Build?: (url: string) => string;
    };
  };
}

interface ImportMetaEnv {
  readonly VITE_LEMONSQUEEZY_STORE_URL?: string;
  readonly VITE_LEMONSQUEEZY_TIER1_URL?: string;
  readonly VITE_LEMONSQUEEZY_TIER2_URL?: string;
  readonly VITE_LEMONSQUEEZY_TIER3_URL?: string;
  readonly VITE_LEMONSQUEEZY_ONETIME_PASS_URL?: string;
  readonly VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL?: string;
  readonly VITE_LEMONSQUEEZY_STANDARD_ANNUAL_URL?: string;
  readonly VITE_LEMONSQUEEZY_PRO_MONTHLY_URL?: string;
  readonly VITE_LEMONSQUEEZY_PRO_ANNUAL_URL?: string;
  readonly VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL?: string;
  readonly VITE_LEMONSQUEEZY_ELITE_ANNUAL_URL?: string;
  readonly VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL?: string;
  readonly VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_URL?: string;
  readonly VITE_APPSUMO_TIER1_URL?: string;
  readonly VITE_APPSUMO_TIER2_URL?: string;
  readonly VITE_APPSUMO_B2B_URL?: string;
  readonly VITE_DEMO_TOUR_URL?: string;
}
