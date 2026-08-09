import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Zap, Users, TrendingUp, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const translations = {
  en: {
    items: [
      { icon: Zap, value: '15', label: 'Free proposals daily' },
      { icon: Users, value: '12K+', label: 'Active users' },
      { icon: TrendingUp, value: '67%', label: 'Avg. acceptance rate' },
      { icon: Download, value: 'Free', label: 'Desktop & mobile app' },
    ],
  },
  tr: {
    items: [
      { icon: Zap, value: '15', label: 'Günlük ücretsiz teklif' },
      { icon: Users, value: '12K+', label: 'Aktif kullanıcı' },
      { icon: TrendingUp, value: '%67', label: 'Ort. kabul oranı' },
      { icon: Download, value: 'Ücretsiz', label: 'Masaüstü ve mobil uygulama' },
    ],
  },
  de: {
    items: [
      { icon: Zap, value: '15', label: 'Kostenlose Angebote täglich' },
      { icon: Users, value: '12K+', label: 'Aktive Nutzer' },
      { icon: TrendingUp, value: '67%', label: 'Durchschn. Akzeptanzrate' },
      { icon: Download, value: 'Kostenlos', label: 'Desktop- & Mobil-App' },
    ],
  },
  fr: {
    items: [
      { icon: Zap, value: '15', label: 'Propositions gratuites/jour' },
      { icon: Users, value: '12K+', label: 'Utilisateurs actifs' },
      { icon: TrendingUp, value: '67%', label: "Taux d'acceptation moy." },
      { icon: Download, value: 'Gratuit', label: 'App bureau & mobile' },
    ],
  },
};

export const ValueBarSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <section className="py-6 border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {t.items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
