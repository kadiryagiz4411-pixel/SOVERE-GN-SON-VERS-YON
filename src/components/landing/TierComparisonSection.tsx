import { useLanguage } from '@/i18n/LanguageContext';
import { Check, X, Lock, Zap, Sparkles, Crown, ArrowRight, Target, TrendingUp, Users, MessageCircle, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCheckoutUrl, PLAN_PRICES } from '@/lib/plans';
import { Link } from 'react-router-dom';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

export const TierComparisonSection = () => {
  const { t } = useLanguage();

  const tiers = [
    {
      name: 'Free',
      icon: Zap,
      price: '0',
      description: t.tierComparison?.free?.description ?? 'Basic application drafts',
      color: 'muted',
      tagline: 'Basic Generation',
      features: [
        { name: t.tierComparison?.features?.basicDrafts ?? 'Basic application text generation', included: true },
        { name: t.tierComparison?.features?.genericSuggestions ?? 'Generic suggestions only', included: true },
        { name: 'No acceptance probability', included: false },
        { name: 'No tracking', included: false },
        { name: 'No strategy', included: false },
      ],
      cta: t.tierComparison?.free?.cta ?? 'Start Free',
      link: '/auth?mode=signup',
      isExternal: false,
      variant: 'outline' as const,
    },
    {
      name: 'Pro',
      icon: Sparkles,
      price: PLAN_PRICES.pro.monthly.toString(),
      description: t.tierComparison?.pro?.description ?? 'Know your acceptance chances',
      color: 'primary',
      badge: t.tierComparison?.pro?.badge ?? 'Most Popular',
      tagline: 'DIAGNOSIS',
      taglineDescription: 'Understand why you\'re getting ignored',
      features: [
        { name: 'Acceptance probability (%) score', included: true, highlight: true },
        { name: 'Explanation of why it may fail/succeed', included: true, highlight: true },
        { name: 'Job matching analysis', included: true, highlight: true },
        { name: 'AI improvement suggestions', included: true, highlight: true },
        { name: 'Visual graph', included: false },
        { name: 'Platform recommendations', included: false },
        { name: 'Outreach messages', included: false },
      ],
      cta: t.tierComparison?.pro?.cta ?? `Get Pro – $${PLAN_PRICES.pro.monthly}/mo`,
      link: getCheckoutUrl('pro'),
      isExternal: true,
      variant: 'gold' as const,
    },
    {
      name: 'Elite',
      icon: Crown,
      price: PLAN_PRICES.elite.monthly.toString(),
      description: t.tierComparison?.elite?.description ?? 'Full acceptance strategy',
      color: 'amber',
      badge: t.tierComparison?.elite?.badge ?? 'Strategy Mode',
      tagline: 'STRATEGY & EXECUTION',
      taglineDescription: 'Get replies and results',
      features: [
        { name: 'Everything in Pro +', included: true },
        { name: 'Visual acceptance probability graph', included: true, highlight: true },
        { name: 'Strategic reasoning analysis', included: true, highlight: true },
        { name: 'Target platforms & companies list', included: true, highlight: true },
        { name: 'Ready-to-paste outreach messages', included: true, highlight: true },
        { name: 'Success Snapshot sharing', included: true, highlight: true },
      ],
      cta: t.tierComparison?.elite?.cta ?? 'Go Elite — Build My Strategy',
      link: getCheckoutUrl('elite'),
      isExternal: true,
      variant: 'outline' as const,
      eliteStyle: true,
    },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t.tierComparison?.badge ?? 'Acceptance Optimization Tiers'}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.tierComparison?.title ?? 'Choose Your Path to Getting Accepted'}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.tierComparison?.subtitle ?? 'From basic drafts to full acceptance strategy. Pick the tier that matches your goals.'}
          </p>
        </div>

        {/* Tiers grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                tier.eliteStyle
                  ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card hover:border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : tier.badge && !tier.eliteStyle
                  ? 'border-primary bg-card shadow-gold'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className={`inline-flex items-center gap-1 px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                    tier.eliteStyle
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                      : 'bg-gradient-to-r from-primary to-amber-600 text-primary-foreground'
                  }`}>
                    <tier.icon className="w-3 h-3" />
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                  tier.eliteStyle
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20'
                    : tier.color === 'primary'
                    ? 'bg-gradient-to-br from-primary to-amber-600 shadow-gold'
                    : 'bg-muted'
                }`}>
                  <tier.icon className={`w-7 h-7 ${tier.color === 'muted' ? 'text-muted-foreground' : 'text-white'}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{tier.name}</h3>
                
                {/* Tagline for tier focus */}
                {tier.tagline && (
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                    tier.eliteStyle
                      ? 'bg-amber-500/20 text-amber-500'
                      : tier.color === 'primary'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {tier.tagline}
                  </div>
                )}
                
                <p className="text-muted-foreground text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-bold ${tier.eliteStyle ? 'text-gradient-gold' : 'text-foreground'}`}>
                    ${tier.price}
                  </span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    {feature.included ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        feature.highlight
                          ? tier.eliteStyle
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-primary/20 text-primary'
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={`text-sm ${
                      feature.included 
                        ? feature.highlight 
                          ? tier.eliteStyle ? 'text-amber-200 font-medium' : 'text-foreground font-medium'
                          : 'text-muted-foreground'
                        : 'text-muted-foreground/50'
                    }`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.isExternal ? (
                <CheckoutButton 
                  href={tier.link}
                  variant={tier.variant} 
                  className={`w-full ${
                    tier.eliteStyle 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0' 
                      : ''
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </CheckoutButton>
              ) : (
                <Link to={tier.link} className="block">
                  <Button variant={tier.variant} className="w-full">
                    {tier.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
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
