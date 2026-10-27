import { Check, Ticket, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APPSUMO_LTD_TIERS, APPSUMO_PRODUCT_URLS, appsumoLtdPriceLabel } from '@/config/appsumo';
import { cn } from '@/lib/utils';

const TIER_THEME = [
  { color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/5', button: 'bg-blue-600 hover:bg-blue-500 text-white' },
  { color: 'text-violet-400', border: 'border-violet-500/50', bg: 'bg-violet-500/5', button: 'bg-violet-600 hover:bg-violet-500 text-white' },
  { color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/5', button: 'bg-amber-500 hover:bg-amber-400 text-slate-950' },
] as const;

/**
 * Maps tier index (0 = Starter, 1 = Pro, 2 = B2B) to the correct AppSumo
 * product listing URL. These are absolute https:// links to AppSumo.com —
 * NOT LemonSqueezy — because the LTD is purchased on AppSumo.
 */
const APPSUMO_TIER_URLS = [
  APPSUMO_PRODUCT_URLS.tier1,  // Starter  $49
  APPSUMO_PRODUCT_URLS.tier2,  // Pro      $149
  APPSUMO_PRODUCT_URLS.tier3,  // B2B/Agency $299
] as const;

export function AppSumoPricing() {
  return (
    <section id="appsumo" className="relative overflow-visible scroll-mt-32 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400">
            AppSumo Lifetime
          </span>
          <h2 className="mb-3 text-3xl font-black text-slate-100 md:text-4xl">
            One-time AppSumo licenses — $49, $149, $299
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Lifetime access with a monthly AI credit quota that refreshes automatically. Chrome extension included. Never a recurring lockout.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {APPSUMO_LTD_TIERS.map((tier, index) => {
            const theme = TIER_THEME[index] ?? TIER_THEME[0];
            const popular = index === 1;
            // Absolute AppSumo.com URL — never a relative path or LS checkout URL.
            const appsumoHref = APPSUMO_TIER_URLS[index] ?? APPSUMO_PRODUCT_URLS.tier1;
            return (
              <article
                key={tier.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-6',
                  theme.border,
                  theme.bg,
                  popular && 'ring-1 ring-violet-400/40',
                )}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white">
                    MOST POPULAR
                  </span>
                )}
                <p className={cn('text-sm font-semibold', theme.color)}>{tier.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-50">
                  ${tier.priceUsd}
                  <span className="ml-1 text-sm font-normal text-slate-400">one-time</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{appsumoLtdPriceLabel(tier.priceUsd)}</p>
                <p className="mt-3 text-sm text-slate-400">{tier.audience}</p>
                <div className={cn('mt-4 inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-xs font-semibold', theme.border, theme.color)}>
                  <Zap className="h-3 w-3" />
                  {tier.monthlyCredits.toLocaleString()} credits / month
                </div>
                <p className="mt-3 text-xs text-slate-500">{tier.extension}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', theme.color)} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/*
                  Plain <a> with target="_blank" — never an internal Link or onClick.
                  AppSumo LTD purchases happen on AppSumo.com, not on LemonSqueezy.
                */}
                <a
                  href={appsumoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                    theme.button,
                  )}
                >
                  Get {tier.label} on AppSumo
                </a>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have a code?{' '}
          <Link to="/redeem" className="inline-flex items-center gap-1 font-semibold text-orange-400 hover:text-orange-300">
            <Ticket className="h-3.5 w-3.5" />
            Redeem it here
          </Link>
        </p>
      </div>
    </section>
  );
}

export default AppSumoPricing;
