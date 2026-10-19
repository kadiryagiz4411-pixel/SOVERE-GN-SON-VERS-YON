import { firstEnv } from './env.js';

export type PlanTier = 'single_pass' | 'standard' | 'pro' | 'elite' | 'B2B_ENTERPRISE' | 'free';
export type BillingPeriod = 'monthly' | 'yearly' | 'once';

export interface TierConfig {
  tier: PlanTier;
  period: BillingPeriod;
}

export function lemonApiKey(): string {
  return firstEnv('LEMONSQUEEZY_API_KEY', 'LEMON_SQUEEZY_API_KEY', 'VITE_LEMONSQUEEZY_API_KEY');
}

export function lemonStoreId(): string {
  return firstEnv('LEMONSQUEEZY_STORE_ID', 'LEMON_SQUEEZY_STORE_ID', 'VITE_LEMONSQUEEZY_STORE_ID');
}

export function lemonWebhookSecret(): string {
  return firstEnv('LEMONSQUEEZY_WEBHOOK_SECRET', 'LEMON_SQUEEZY_WEBHOOK_SECRET');
}

export function variantMap(): Map<string, TierConfig> {
  const map = new Map<string, TierConfig>();
  const put = (keys: string[], cfg: TierConfig) => {
    const id = firstEnv(...keys);
    if (id) map.set(id, cfg);
  };
  put(['LS_VARIANT_STANDARD_MONTHLY', 'VITE_STANDARD_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID', 'VITE_LEMONSQUEEZY_STANDARD_VARIANT_ID', 'VITE_LEMONSQUEEZY_STANDARD_MONTHLY_VARIANT_ID'], { tier: 'standard', period: 'monthly' });
  put(['LS_VARIANT_STANDARD_ANNUAL', 'VITE_STANDARD_YEARLY_VARIANT_ID', 'VITE_LEMONSQUEEZY_STANDARD_ANNUAL_VARIANT_ID'], { tier: 'standard', period: 'yearly' });
  put(['LS_VARIANT_PRO_MONTHLY', 'VITE_PRO_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID', 'VITE_LEMONSQUEEZY_PRO_VARIANT_ID', 'VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID'], { tier: 'pro', period: 'monthly' });
  put(['LS_VARIANT_PRO_ANNUAL', 'VITE_PRO_YEARLY_VARIANT_ID', 'VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID'], { tier: 'pro', period: 'yearly' });
  put(['LS_VARIANT_ELITE_MONTHLY', 'VITE_ELITE_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_ELITE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ELITE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ELITE_MONTHLY_VARIANT_ID'], { tier: 'elite', period: 'monthly' });
  put(['LS_VARIANT_ELITE_ANNUAL', 'VITE_ELITE_YEARLY_VARIANT_ID', 'VITE_LEMONSQUEEZY_ELITE_ANNUAL_VARIANT_ID'], { tier: 'elite', period: 'yearly' });
  put(['LS_VARIANT_ENTERPRISE_MONTHLY', 'VITE_ENTERPRISE_MONTHLY_VARIANT_ID', 'NEXT_PUBLIC_LEMONSQUEEZY_ENTERPRISE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ENTERPRISE_VARIANT_ID', 'VITE_LEMONSQUEEZY_ENTERPRISE_MONTHLY_VARIANT_ID'], { tier: 'B2B_ENTERPRISE', period: 'monthly' });
  put(['LS_VARIANT_ENTERPRISE_ANNUAL', 'VITE_ENTERPRISE_YEARLY_VARIANT_ID', 'VITE_LEMONSQUEEZY_ENTERPRISE_ANNUAL_VARIANT_ID'], { tier: 'B2B_ENTERPRISE', period: 'yearly' });
  if (!map.has('2020873')) map.set('2020873', { tier: 'standard', period: 'monthly' });
  if (!map.has('2020643')) map.set('2020643', { tier: 'standard', period: 'yearly' });
  if (!map.has('2020868')) map.set('2020868', { tier: 'pro', period: 'monthly' });
  if (!map.has('2020735')) map.set('2020735', { tier: 'pro', period: 'yearly' });
  if (!map.has('2020866')) map.set('2020866', { tier: 'elite', period: 'monthly' });
  if (!map.has('2020838')) map.set('2020838', { tier: 'elite', period: 'yearly' });
  if (!map.has('2020877')) map.set('2020877', { tier: 'B2B_ENTERPRISE', period: 'monthly' });
  if (!map.has('2020842')) map.set('2020842', { tier: 'B2B_ENTERPRISE', period: 'yearly' });
  return map;
}

const DEFAULT_VARIANTS: Record<string, Record<string, string>> = {
  standard: { monthly: '2020873', yearly: '2020643', annual: '2020643' },
  pro: { monthly: '2020868', yearly: '2020735', annual: '2020735' },
  elite: { monthly: '2020866', yearly: '2020838', annual: '2020838' },
  enterprise: { monthly: '2020877', yearly: '2020842', annual: '2020842' },
  B2B_ENTERPRISE: { monthly: '2020877', yearly: '2020842', annual: '2020842' },
};

export function resolveVariantId(planId?: string, billingCycle?: string): string {
  const plan = String(planId ?? '').trim().toLowerCase();
  const cycle = String(billingCycle ?? 'monthly').trim().toLowerCase();
  const period = cycle === 'yearly' || cycle === 'annual' || cycle === 'year' ? 'yearly' : 'monthly';
  const map = variantMap();
  for (const [id, cfg] of map.entries()) {
    const tierKey = cfg.tier === 'B2B_ENTERPRISE' ? 'enterprise' : cfg.tier;
    if ((tierKey === plan || cfg.tier.toLowerCase() === plan) && cfg.period === period) {
      return id;
    }
  }
  return DEFAULT_VARIANTS[plan]?.[period] || DEFAULT_VARIANTS[plan]?.[cycle] || '';
}

