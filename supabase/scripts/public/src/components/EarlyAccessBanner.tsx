import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const EarlyAccessBanner = () => {
  const { language } = useLanguage();

  const text = {
    en: {
      title: 'Early Access Version',
      subtitle: 'Your feedback shapes Sovereign.',
    },
    tr: {
      title: 'Erken Erişim Sürümü',
      subtitle: 'Geri bildiriminiz Sovereign\'i şekillendiriyor.',
    },
    de: {
      title: 'Frühzugangsversion',
      subtitle: 'Ihr Feedback formt Sovereign.',
    },
    fr: {
      title: 'Version Accès Anticipé',
      subtitle: 'Vos retours façonnent Sovereign.',
    },
  };

  const t = text[language] || text.en;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/90 via-amber-500/90 to-primary/90 text-primary-foreground">
      <div className="container mx-auto px-4 py-1.5">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-medium">{t.title}</span>
          <span className="opacity-70 hidden sm:inline">—</span>
          <span className="opacity-70 hidden sm:inline">{t.subtitle}</span>
        </div>
      </div>
    </div>
  );
};
