import { useLanguage } from '@/i18n/LanguageContext';
import { Crown, UserSearch, MessageCircle, Target, Sparkles, ArrowRight } from 'lucide-react';
import { getCheckoutUrl, PLAN_PRICES } from '@/lib/plans';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

export const EliteFeaturesSection = () => {
  const { t } = useLanguage();

  const eliteFeatures = [
    {
      icon: UserSearch,
      title: t.eliteFeatures.decisionMaker.title,
      description: t.eliteFeatures.decisionMaker.description,
      highlights: t.eliteFeatures.decisionMaker.highlights,
    },
    {
      icon: MessageCircle,
      title: t.eliteFeatures.outreach.title,
      description: t.eliteFeatures.outreach.description,
      highlights: t.eliteFeatures.outreach.highlights,
    },
    {
      icon: Target,
      title: t.eliteFeatures.strategy.title,
      description: t.eliteFeatures.strategy.description,
      highlights: t.eliteFeatures.strategy.highlights,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-card to-background relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.eliteFeatures.badge}</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.eliteFeatures.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.eliteFeatures.subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {eliteFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl border border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 card-hover"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              
              {/* Title & Description */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              {/* Highlights */}
              <ul className="space-y-2">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                {t.eliteFeatures.ctaTitle}
              </span>
            </div>
            <p className="text-muted-foreground max-w-md">
              {t.eliteFeatures.ctaSubtitle}
            </p>
            <CheckoutButton href={getCheckoutUrl('elite')} variant="gold" size="lg" className="group">
              {t.eliteFeatures.ctaButton} – ${PLAN_PRICES.elite.annual}/yr
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </CheckoutButton>
          </div>
        </div>
      </div>
    </section>
  );
};
