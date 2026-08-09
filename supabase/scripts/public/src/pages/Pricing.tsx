import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PricingSection } from '@/components/landing/PricingSection';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Pricing = () => {
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const { language } = useLanguage();
  const navigate = useNavigate();

  const bannerText = {
    en: {
      title: '🎉 Profile setup complete!',
      subtitle: 'Your AI is ready. Choose a plan to unlock your personalized strategy.',
      skip: 'Continue with Free plan',
    },
    tr: {
      title: '🎉 Profil kurulumu tamamlandı!',
      subtitle: 'Yapay zekanız hazır. Kişiselleştirilmiş stratejinizi açmak için bir plan seçin.',
      skip: 'Ücretsiz planla devam et',
    },
    de: {
      title: '🎉 Profil-Setup abgeschlossen!',
      subtitle: 'Ihre KI ist bereit. Wählen Sie einen Plan.',
      skip: 'Mit kostenlosem Plan fortfahren',
    },
    fr: {
      title: '🎉 Profil configuré !',
      subtitle: 'Votre IA est prête. Choisissez un plan.',
      skip: 'Continuer avec le plan gratuit',
    },
  };
  const b = bannerText[language as keyof typeof bannerText] || bannerText.en;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {fromOnboarding && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
            <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => navigate('/dashboard')}
              >
                {b.skip}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;

