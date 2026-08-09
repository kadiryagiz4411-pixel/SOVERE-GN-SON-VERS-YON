import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { getCheckoutUrl } from '@/lib/plans';
import { useLanguage } from '@/i18n/LanguageContext';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

interface UpgradeBannerProps {
  currentPlan: string;
}

const translations = {
  en: {
    upgradePro: 'Upgrade to Pro',
    proDesc: 'Unlimited proposals, acceptance score & more',
    upgradeElite: 'Upgrade to Elite',
    eliteDesc: 'Outreach messages, decision-maker ID & full strategy',
  },
  tr: {
    upgradePro: 'Pro\'ya Yükselt',
    proDesc: 'Sınırsız teklif, kabul skoru ve daha fazlası',
    upgradeElite: 'Elite\'e Yükselt',
    eliteDesc: 'İletişim mesajları, karar verici tespiti ve tam strateji',
  },
  de: {
    upgradePro: 'Auf Pro upgraden',
    proDesc: 'Unbegrenzte Angebote, Akzeptanz-Score und mehr',
    upgradeElite: 'Auf Elite upgraden',
    eliteDesc: 'Outreach-Nachrichten, Entscheider-ID und volle Strategie',
  },
  fr: {
    upgradePro: 'Passer à Pro',
    proDesc: 'Propositions illimitées, score d\'acceptation et plus',
    upgradeElite: 'Passer à Elite',
    eliteDesc: 'Messages de prospection, identification décideur et stratégie complète',
  },
};

export const UpgradeBanner = ({ currentPlan }: UpgradeBannerProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  if (currentPlan === 'elite') return null;

  const isFreePlan = currentPlan !== 'pro' && currentPlan !== 'elite';

  if (isFreePlan) {
    return (
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t.upgradePro}</p>
            <p className="text-xs text-muted-foreground">{t.proDesc}</p>
          </div>
        </div>
        <CheckoutButton href={getCheckoutUrl('pro')} size="sm" className="gap-1.5">
          {t.upgradePro}
          <ArrowRight className="w-3.5 h-3.5" />
        </CheckoutButton>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.upgradeElite}</p>
          <p className="text-xs text-muted-foreground">{t.eliteDesc}</p>
        </div>
      </div>
      <CheckoutButton href={getCheckoutUrl('elite')} size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0">
        {t.upgradeElite}
        <ArrowRight className="w-3.5 h-3.5" />
      </CheckoutButton>
    </div>
  );
};
