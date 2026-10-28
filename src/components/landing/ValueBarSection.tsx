import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Zap, Users, TrendingUp, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { asIcon } from '@/lib/safeIcon';

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
    <section className="border-y border-zinc-800 bg-[#09090b]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-px bg-zinc-800 md:grid-cols-4">
          {t.items.map((item, i) => {
            const Icon = asIcon(item.icon, Zap);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 bg-[#09090b] px-4 py-5"
              >
                <div className="flex h-9 w-9 items-center justify-center border border-amber-500/40 bg-amber-500/10">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="font-mono text-lg font-medium tracking-tight text-zinc-50">{item.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">{item.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
