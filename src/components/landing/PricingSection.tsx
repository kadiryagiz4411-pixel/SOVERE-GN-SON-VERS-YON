import { useSearchParams } from 'react-router-dom';
import { PricingTable } from '@/components/pricing/PricingTable';
import { useLanguage } from '@/i18n/LanguageContext';

export const PricingSection = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  return (
    <section id="pricing" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-4">
          <span className="inline-block px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-100 mb-4 leading-tight">
            {t.pricing?.title ?? 'Choose Your Path to Success'}
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t.pricing?.subtitle ?? 'From individual job seekers to enterprise HR teams — Sovereign scales with your ambition.'}
          </p>
        </div>

        {/* Pricing table */}
        <PricingTable
          showEnterprise
          className="max-w-screen-xl mx-auto"
        />
      </div>
    </section>
  );
};
