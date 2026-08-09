import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { Check, Sparkles, Crown } from 'lucide-react';
import { getCheckoutUrl, PLAN_PRICES, getAnnualSavings } from '@/lib/plans';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

export const PricingSection = () => {
  const { t } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(true);
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const proPrice = isAnnual ? Math.round(PLAN_PRICES.pro.annual / 12) : PLAN_PRICES.pro.monthly;
  const elitePrice = isAnnual ? Math.round(PLAN_PRICES.elite.annual / 12) : PLAN_PRICES.elite.monthly;
  const proSavings = getAnnualSavings('pro');
  const eliteSavings = getAnnualSavings('elite');

  const plans = [
    {
      name: t.pricing?.basic?.name ?? 'Free',
      price: '0',
      priceLabel: t.pricing?.forever ?? 'forever',
      description: t.pricing?.basic?.description ?? 'Basic application drafts',
      features: t.pricing?.basic?.features ?? ['5 applications per day', 'Basic text generation'],
      cta: t.pricing?.basic?.cta ?? 'Start Free',
      popular: false,
      variant: 'outline' as const,
      link: fromOnboarding ? '/dashboard' : '/auth?mode=signup',
      isExternal: false,
      showPeriod: false,
    },
    {
      name: t.pricing?.pro?.name ?? 'Pro',
      price: proPrice.toString(),
      priceLabel: isAnnual ? (t.pricing?.perMonth ?? '/mo') : (t.pricing?.perMonth ?? '/mo'),
      description: t.pricing?.pro?.description ?? 'Know your acceptance chances',
      features: t.pricing?.pro?.features ?? ['Unlimited applications', 'Acceptance probability score'],
      cta: `${t.pricing?.pro?.cta ?? 'Get Pro'} – $${isAnnual ? PLAN_PRICES.pro.annual + '/yr' : PLAN_PRICES.pro.monthly + '/mo'}`,
      popular: true,
      variant: 'gold' as const,
      link: getCheckoutUrl('pro', isAnnual),
      isExternal: true,
      badge: t.pricing?.popular ?? 'Most Popular',
      savings: isAnnual ? proSavings : 0,
      showPeriod: true,
    },
    {
      name: t.pricing?.elite?.name ?? 'Elite',
      price: elitePrice.toString(),
      priceLabel: isAnnual ? (t.pricing?.perMonth ?? '/mo') : (t.pricing?.perMonth ?? '/mo'),
      description: t.pricing?.elite?.description ?? 'Full acceptance strategy',
      features: t.pricing?.elite?.features ?? ['Everything in Pro', 'Visual acceptance graph'],
      cta: t.pricing?.elite?.cta ?? 'Go Elite — Build My Strategy',
      popular: false,
      variant: 'outline' as const,
      link: getCheckoutUrl('elite', isAnnual),
      isExternal: true,
      badge: t.pricing?.strategyMode ?? 'Strategy Mode',
      eliteStyle: true,
      savings: isAnnual ? eliteSavings : 0,
      showPeriod: true,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.pricing?.title ?? 'Choose Your Path to Acceptance'}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.pricing?.subtitle ?? 'Start free, upgrade when you\'re ready to maximize your success rate.'}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t.pricing?.monthly ?? 'Monthly'}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAnnual ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${isAnnual ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            {(t.pricing as any)?.annual ?? 'Annual'}
          </span>
          {isAnnual && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
              {(t.pricing as any)?.saveUpTo ?? 'Save up to 36%'}
            </span>
          )}
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border transition-all duration-300 card-hover ${
                plan.eliteStyle
                  ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card hover:border-amber-500/50'
                  : plan.popular
                  ? 'border-primary bg-card shadow-gold'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`inline-flex items-center gap-1 px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                    plan.eliteStyle
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                      : 'bg-gradient-to-r from-primary to-amber-600 text-primary-foreground'
                  }`}>
                    {plan.popular ? <Sparkles className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold ${plan.eliteStyle ? 'text-gradient-gold' : 'text-foreground'}`}>
                    ${plan.price}
                  </span>
                  {plan.showPeriod && (
                    <span className="text-muted-foreground text-sm">{plan.priceLabel}</span>
                  )}
                </div>
                {plan.savings !== undefined && plan.savings > 0 && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                    💰 Save ${plan.savings}/year
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 mt-0.5 ${
                      plan.eliteStyle ? 'text-amber-500' : 'text-primary'
                    }`} />
                    <span className="text-muted-foreground text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.isExternal ? (
                <CheckoutButton 
                  href={plan.link}
                  variant={plan.variant} 
                  className={`w-full ${
                    plan.eliteStyle 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0' 
                      : ''
                  }`}
                >
                  {plan.cta}
                </CheckoutButton>
              ) : (
                <Link to={plan.link} className="block">
                  <Button variant={plan.variant} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
