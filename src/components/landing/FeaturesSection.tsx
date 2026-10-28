import { useLanguage } from '@/i18n/LanguageContext';
import { Target, ShieldCheck, BarChart3, Building2 } from 'lucide-react';

export const FeaturesSection = ({ showHeader = true }: { showHeader?: boolean }) => {
  const { t } = useLanguage();

  const features = [
    {
      icon: BarChart3,
      title: t.features.acceptanceProbability?.title || 'Acceptance Probability',
      description: t.features.acceptanceProbability?.description || 'Know your chances before you apply. Get a clear percentage score with explanations.',
    },
    {
      icon: Building2,
      title: t.features.companyOptimization?.title || 'Company-Specific Optimization',
      description: t.features.companyOptimization?.description || 'Each application is tailored to the specific company, role, and culture.',
    },
    {
      icon: Target,
      title: t.features.strategicInsights?.title || 'Strategic Insights',
      description: t.features.strategicInsights?.description || 'Understand exactly why applications succeed or fail, with actionable improvements.',
    },
    {
      icon: ShieldCheck,
      title: t.features.control?.title || 'You Stay In Control',
      description: t.features.control?.description || 'Review, edit, and approve everything. AI assists, you decide.',
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-zinc-800 bg-[#09090b] py-24">
      <div className="container mx-auto px-4">
        {showHeader && (
          <div className="mb-10 border-b border-zinc-800 pb-6">
            <p className="font-mono text-[11px] tracking-[0.22em] text-amber-400">SYS.CAPABILITY</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              {t.features.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-zinc-500 md:text-base">
              {t.features.subtitle}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-[#09090b] p-6 transition-colors duration-150 hover:bg-zinc-900/70"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center border border-amber-500/40 bg-amber-500/10">
                  <feature.icon className="h-4 w-4 text-amber-400" />
                </div>
                <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-base font-medium text-zinc-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
