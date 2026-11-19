/**
 * Hosted checkout URL helpers. Payment is Polar.sh only (Stripe-backed).
 * Never returns a Lemon Squeezy or AppSumo URL.
 */

const AFFILIATE_QUERY_KEYS = ['aff', 'via', 'aff_ref', 'ref', 'code'] as const;
const AFFILIATE_STORAGE = 'ls_aff';
const BILLING_FALLBACK = '/pricing';
const ALLOWED_CHECKOUT_HOSTS = new Set(['polar.sh', 'sandbox.polar.sh', 'buy.polar.sh']);

function firstSearchParam(params: URLSearchParams, keys: readonly string[]): string {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return '';
}

export function captureAffiliateCode(search?: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(search ?? window.location.search);
    const code = firstSearchParam(params, AFFILIATE_QUERY_KEYS);
    if (code) {
      try { localStorage.setItem(AFFILIATE_STORAGE, code); } catch { /* private mode */ }
    }
    return code;
  } catch {
    return '';
  }
}

function readAffiliateCode(): string {
  if (typeof window === 'undefined') return '';
  const fromUrl = captureAffiliateCode();
  if (fromUrl) return fromUrl;
  try {
    const stored = localStorage.getItem(AFFILIATE_STORAGE);
    if (stored?.trim()) return stored.trim();
  } catch { /* ignore */ }
  return '';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function unwrapMarkdownUrl(raw: string): string {
  const trimmed = raw.trim();
  const md = trimmed.match(/^\[[^\]]*]\((https?:\/\/[^)]+)\)$/i);
  if (md?.[1]) return md[1];
  return trimmed.replace(/^\[|]$/g, '').trim();
}

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

export function getSupportUrl(): string {
  const support = unwrapMarkdownUrl(firstEnv('VITE_SUPPORT_URL') || 'https://sovereignapp.pro/pricing');
  return isHttpUrl(support) ? support : 'https://sovereignapp.pro/pricing';
}

export function getBillingFallbackUrl(): string {
  return BILLING_FALLBACK;
}

/** @deprecated Use getBillingFallbackUrl. Kept so older imports compile during the Polar cutover. */
export const getLemonStoreUrl = getBillingFallbackUrl;

export function isBrokenCheckoutUrl(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const value = unwrapMarkdownUrl(String(raw));
  if (!value || value === '#' || value === 'undefined' || value === 'null') return true;
  if (value.includes('undefined') || value.includes('null')) return true;
  if (/lemonsqueezy\.com|lmsqueezy\.com|appsumo\.com/i.test(value)) return true;
  if (value.startsWith('/')) return false;
  if (!isHttpUrl(value)) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (ALLOWED_CHECKOUT_HOSTS.has(host) || host.endsWith('.polar.sh')) return false;
    if (host === 'sovereignapp.pro' && (url.pathname === '/pricing' || url.pathname.startsWith('/pricing'))) return false;
    return true;
  } catch {
    return true;
  }
}

export function sanitizeCheckoutUrl(raw: string | null | undefined, fallback = getBillingFallbackUrl()): string {
  const value = unwrapMarkdownUrl(String(raw ?? ''));
  if (isBrokenCheckoutUrl(value)) return fallback;
  return value;
}

export function attachAffiliateTracking(baseUrl: string): string {
  if (!isHttpUrl(baseUrl) && !baseUrl.startsWith('/')) return baseUrl;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sovereignapp.pro';
    const urlObj = baseUrl.startsWith('/') ? new URL(baseUrl, origin) : new URL(baseUrl);
    if (firstSearchParam(urlObj.searchParams, AFFILIATE_QUERY_KEYS)) return urlObj.toString();
    const code = readAffiliateCode();
    if (!code) return baseUrl.startsWith('/') ? `${urlObj.pathname}${urlObj.search}${urlObj.hash}` : urlObj.toString();
    urlObj.searchParams.set('aff_ref', code);
    if (!urlObj.searchParams.has('aff')) urlObj.searchParams.set('aff', code);
    if (baseUrl.startsWith('/')) return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    return urlObj.toString();
  } catch {
    return baseUrl;
  }
}

export function attachCheckoutIdentity(baseUrl: string, userEmail?: string | null, userId?: string | null): string {
  const clean = sanitizeCheckoutUrl(baseUrl);
  if (!isHttpUrl(clean)) return attachAffiliateTracking(clean);
  try {
    const urlObj = new URL(clean);
    if (userEmail) urlObj.searchParams.set('customer_email', userEmail);
    if (userId) urlObj.searchParams.set('customer_external_id', userId);
    return attachAffiliateTracking(urlObj.toString());
  } catch {
    return attachAffiliateTracking(clean);
  }
}

export function getCheckoutUrl(_tier?: string, _userEmail?: string, _userId?: string): string {
  return getBillingFallbackUrl();
}

export function redirectToCheckout(_tier?: string, _userEmail?: string, _userId?: string) {
  if (typeof window === 'undefined') return;
  window.location.assign(getBillingFallbackUrl());
}

export const LS_CHECKOUT_URLS = {
  standard: { monthly: BILLING_FALLBACK, yearly: BILLING_FALLBACK },
  pro: { monthly: BILLING_FALLBACK, yearly: BILLING_FALLBACK },
  elite: { monthly: BILLING_FALLBACK, yearly: BILLING_FALLBACK },
  enterprise: { monthly: BILLING_FALLBACK, yearly: BILLING_FALLBACK },
  single_pass: { oneTime: BILLING_FALLBACK },
} as const;
