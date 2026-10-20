import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { useLanguage } from '@/i18n/LanguageContext';
import { Zap, LineChart, Clock, Users } from 'lucide-react';

const Features = () => {
  const { t } = useLanguage();

  const extra = t.features.additional;
  const additionalFeatures = [
    {
      icon: Zap,
      title: extra?.instant?.title || 'Instant Generation',
      description: extra?.instant?.description || 'Get professional proposals in under 30 seconds. No more staring at blank pages.',
    },
    {
      icon: LineChart,
      title: extra?.insights?.title || 'Performance Insights',
      description: extra?.insights?.description || 'Track which proposals win and learn what works best for your niche.',
    },
    {
      icon: Clock,
      title: extra?.time?.title || 'Time Tracking',
      description: extra?.time?.description || 'See exactly how much time you save with AI-assisted workflows.',
    },
    {
      icon: Users,
      title: extra?.clients?.title || 'Client Management',
      description: extra?.clients?.description || 'Keep all your client communications and proposals organized in one place.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              {t.features.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>
        </section>

        {/* Main Features — header already rendered above to avoid duplicate title */}
        <FeaturesSection showHeader={false} />

        {/* Additional Features */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.features.additional?.title || 'And Much More'}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t.features.additional?.subtitle || 'Everything you need to streamline your freelance business'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {additionalFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 card-hover"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
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
      </main>
      <Footer />
    </div>
  );
};

export default Features;
