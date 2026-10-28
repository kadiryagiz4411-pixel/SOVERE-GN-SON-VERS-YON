/**
 * Lemon Squeezy checkout sanitizer.
 * Never returns '#', 'undefined', or a numeric /checkout/buy/{id} 404 path.
 */

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup?: (opts?: unknown) => void;
      Url?: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
  }
}

export type LemonCheckoutTier =
  | 'tier_1'
  | 'tier_2'
  | 'tier_3'
  | 'standard'
  | 'pro'
  | 'elite'
  | 'enterprise'
  | 'single_pass'
  | string;

export interface TierCheckoutConfig {
  tier1Url: string;
  tier2Url: string;
  tier3Url: string;
}

const DEFAULT_STORE = 'https://sovereignapp.lemonsqueezy.com';

function env(key: string): string {
  try {
    return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim();
  } catch {
    return '';
  }
}

function firstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = env(key);
    if (value) return value;
  }
  return '';
}

/** Strip markdown-link wrappers accidentally pasted into env vars. */
function unwrapMarkdownUrl(raw: string): string {
  const trimmed = raw.trim();
  const md = trimmed.match(/^\[[^\]]*]\((https?:\/\/[^)]+)\)$/i);
  if (md?.[1]) return md[1];
  return trimmed.replace(/^\[|]$/g, '').trim();
}

export function getSupportUrl(): string {
  const support = unwrapMarkdownUrl(
    firstEnv('VITE_SUPPORT_URL', 'VITE_LEMONSQUEEZY_CONTACT_URL') || 'https://sovereignapp.pro/pricing',
  );
  return isHttpUrl(support) ? support : 'https://sovereignapp.pro/pricing';
}

export function getLemonStoreUrl(): string {
  const raw = firstEnv('VITE_LEMONSQUEEZY_STORE_URL', 'VITE_LEMONSQUEEZY_CONTACT_URL');
  if (raw) {
    const cleaned = unwrapMarkdownUrl(raw).replace(/\/$/, '');
    // Only trust it if it's a proper https URL — reject 'undefined', 'null',
    // relative paths and sovereignapp.pro URLs that would be captured by
    // React Router and 404 on the SPA.
    if (isHttpUrl(cleaned) && !cleaned.includes('sovereignapp.pro')) return cleaned;
  }
  // Hardcoded LS store is the immovable fallback. Never return an internal SPA path.
  return DEFAULT_STORE;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Numeric Lemon Squeezy variant IDs are NOT valid buy-path slugs.
 * `/checkout/buy/2020873` 404s. Only UUID checkout slugs belong in the path.
 */
export function isBrokenCheckoutUrl(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const value = unwrapMarkdownUrl(String(raw));
  if (!value || value === '#' || value === 'undefined' || value === 'null') return true;
  if (value.includes('undefined') || value.includes('null')) return true;
  if (!isHttpUrl(value)) return true;
  try {
    const url = new URL(value);
    const buyMatch = url.pathname.match(/\/(?:checkout\/)?buy\/([^/]+)/i);
    if (buyMatch?.[1] && /^\d+$/.test(buyMatch[1])) return true;
    return false;
  } catch {
    return true;
  }
}

export function sanitizeCheckoutUrl(raw: string | null | undefined, fallback = getLemonStoreUrl()): string {
  const value = unwrapMarkdownUrl(String(raw ?? ''));
  if (isBrokenCheckoutUrl(value)) {
    console.warn('[LemonSqueezy] Invalid checkout URL detected. Falling back to store.', { raw });
    return fallback;
  }
  return value;
}

function checkoutUrlFromEnvOrStore(keys: string[], fallbackPath?: string): string {
  const fromEnv = firstEnv(...keys);
  if (fromEnv && !isBrokenCheckoutUrl(fromEnv)) return unwrapMarkdownUrl(fromEnv);
  if (fallbackPath && !isBrokenCheckoutUrl(fallbackPath)) return fallbackPath;
  return getLemonStoreUrl();
}

/**
 * Canonical Lemon Squeezy buy-path UUIDs — verified by the store owner.
 * Keep these in sync with FALLBACK_CHECKOUT_URLS in src/config/plans.ts.
 */
export const LS_CHECKOUT_URLS = {
  standard:    { monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/38a01448-3041-4e6d-8744-31287b12148a', yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/ae00354b-bdc6-4f24-88b9-971ada805e59' },
  pro:         { monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/c0ce34b3-8cd0-4554-9d06-f0de2fd2fec6', yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/b1be220d-f6b3-4b69-9808-0a08082f2fd5' },
  elite:       { monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/ada6ee8b-8dfc-48a8-a613-b38464ae323b', yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/9fdfa0f4-2dc3-47ef-a4b1-f6be5e1c7532' },
  enterprise:  { monthly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/6ecc3830-d895-41c1-8204-e584b37563f0', yearly: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/5ad8c5b2-0061-4881-8402-8d110ec4b542' },
  single_pass: { oneTime: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/f3546a02-e784-4205-b319-d8324b9a1863' },
  appsumo:     { tier1:   'https://sovereignapp.lemonsqueezy.com/checkout/buy/1b6e35ec-fba6-441f-8b9a-7ac90d5fa4c2', tier2: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/6c9a1e9f-3870-49b2-a248-092a20718e48', tier3: 'https://sovereignapp.lemonsqueezy.com/checkout/buy/9075cf3d-2e73-4c22-b200-3b8db0c91e02' },
} as const;

export const TIER_CHECKOUT_CONFIG: TierCheckoutConfig = {
  get tier1Url() {
    return checkoutUrlFromEnvOrStore(
      ['VITE_LEMONSQUEEZY_TIER1_URL', 'VITE_LEMONSQUEEZY_STANDARD_MONTHLY_URL'],
      LS_CHECKOUT_URLS.standard.monthly,
    );
  },
  get tier2Url() {
    return checkoutUrlFromEnvOrStore(
      ['VITE_LEMONSQUEEZY_TIER2_URL', 'VITE_LEMONSQUEEZY_PRO_MONTHLY_URL'],
      LS_CHECKOUT_URLS.pro.monthly,
    );
  },
  get tier3Url() {
    return checkoutUrlFromEnvOrStore(
      ['VITE_LEMONSQUEEZY_TIER3_URL', 'VITE_LEMONSQUEEZY_ELITE_MONTHLY_URL', 'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL'],
      LS_CHECKOUT_URLS.elite.monthly,
    );
  },
};

function normalizeTier(tier: LemonCheckoutTier): 'tier_1' | 'tier_2' | 'tier_3' | 'enterprise' | 'single_pass' {
  const key = String(tier ?? '').trim().toLowerCase();
  if (key === 'single_pass' || key === 'onetime' || key === 'one_time') return 'single_pass';
  if (key === 'enterprise' || key === 'b2b' || key === 'b2b_enterprise' || key === 'appsumo_b2b') return 'enterprise';
  if (key === 'tier_3' || key === 'elite' || key === 'appsumo_tier3') return 'tier_3';
  if (key === 'tier_2' || key === 'pro' || key === 'appsumo_tier2') return 'tier_2';
  return 'tier_1';
}

export function getCheckoutUrl(
  tier: LemonCheckoutTier,
  userEmail?: string,
  userId?: string,
): string {
  const urls: Record<string, string> = {
    tier_1: TIER_CHECKOUT_CONFIG.tier1Url,
    tier_2: TIER_CHECKOUT_CONFIG.tier2Url,
    tier_3: TIER_CHECKOUT_CONFIG.tier3Url,
    enterprise: checkoutUrlFromEnvOrStore([
      'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_URL',
      'VITE_APPSUMO_B2B_URL',
      'VITE_LEMONSQUEEZY_TIER3_URL',
    ]),
    single_pass: checkoutUrlFromEnvOrStore(['VITE_LEMONSQUEEZY_ONETIME_PASS_URL']),
  };

  const mapped = normalizeTier(tier);
  let baseUrl = urls[mapped] || urls.tier_1;

  if (isBrokenCheckoutUrl(baseUrl)) {
    console.warn(`[LemonSqueezy] Invalid checkout URL detected for ${tier}. Falling back to default store.`);
    baseUrl = getLemonStoreUrl();
  }

  try {
    const urlObj = new URL(baseUrl);
    if (userEmail) urlObj.searchParams.set('checkout[email]', userEmail);
    if (userId) urlObj.searchParams.set('checkout[custom][user_id]', userId);
    if (typeof window !== 'undefined') {
      urlObj.searchParams.set('checkout[redirect_url]', `${window.location.origin}/dashboard?payment=success`);
    }
    return urlObj.toString();
  } catch (err) {
    console.error('[LemonSqueezy] URL parse failed', err, { baseUrl });
    return getLemonStoreUrl();
  }
}

export function attachCheckoutIdentity(baseUrl: string, userEmail?: string | null, userId?: string | null): string {
  const clean = sanitizeCheckoutUrl(baseUrl);
  try {
    const urlObj = new URL(clean);
    if (userEmail) urlObj.searchParams.set('checkout[email]', userEmail);
    if (userId) urlObj.searchParams.set('checkout[custom][user_id]', userId);
    if (typeof window !== 'undefined' && !urlObj.searchParams.has('checkout[redirect_url]')) {
      urlObj.searchParams.set('checkout[redirect_url]', `${window.location.origin}/dashboard?payment=success`);
    }
    return urlObj.toString();
  } catch {
    return clean;
  }
}

export function checkoutUrlFromVariant(variantId: string | null | undefined): string {
  const id = String(variantId ?? '').trim();
  if (!id || id === 'undefined') return getLemonStoreUrl();
  if (isHttpUrl(id)) return sanitizeCheckoutUrl(id);
  if (UUID_RE.test(id)) return `${getLemonStoreUrl()}/checkout/buy/${id}`;
  // Numeric API variant IDs are not buy slugs — opening them 404s.
  console.warn('[LemonSqueezy] Refusing numeric variant buy-path (404). Using store URL.', { variantId: id });
  return getLemonStoreUrl();
}

export const redirectToCheckout = (tier: string, userEmail?: string, userId?: string) => {
  try {
    const checkoutUrl = getCheckoutUrl(tier, userEmail, userId);
    if (typeof window.createLemonSqueezy === 'function') {
      window.createLemonSqueezy();
    }
    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
      return;
    }
    // Open in new tab — prevents React Router from intercepting the navigation.
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.error('[LemonSqueezy] Redirect error:', err);
    window.open(getLemonStoreUrl(), '_blank', 'noopener,noreferrer');
  }
};
