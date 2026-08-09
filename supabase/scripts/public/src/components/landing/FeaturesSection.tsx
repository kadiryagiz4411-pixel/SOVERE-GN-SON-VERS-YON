import { useLanguage } from '@/i18n/LanguageContext';
import { Target, ShieldCheck, BarChart3, Building2 } from 'lucide-react';

export const FeaturesSection = () => {
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
    <section className="py-24 bg-card relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.features.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.features.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl border border-border bg-background hover:border-primary/50 transition-all duration-300 card-hover"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
