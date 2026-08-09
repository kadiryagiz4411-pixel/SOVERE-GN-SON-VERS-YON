import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, useInView } from 'framer-motion';
import { Users, FileText, TrendingUp, Globe } from 'lucide-react';

const translations = {
  en: {
    stats: [
      { value: 12500, suffix: '+', label: 'Proposals Generated', icon: FileText },
      { value: 4800, suffix: '+', label: 'Active Users', icon: Users },
      { value: 67, suffix: '%', label: 'Avg. Acceptance Rate', icon: TrendingUp },
      { value: 50, suffix: '+', label: 'Languages Supported', icon: Globe },
    ],
  },
  tr: {
    stats: [
      { value: 12500, suffix: '+', label: 'Oluşturulan Teklif', icon: FileText },
      { value: 4800, suffix: '+', label: 'Aktif Kullanıcı', icon: Users },
      { value: 67, suffix: '%', label: 'Ort. Kabul Oranı', icon: TrendingUp },
      { value: 50, suffix: '+', label: 'Desteklenen Dil', icon: Globe },
    ],
  },
  de: {
    stats: [
      { value: 12500, suffix: '+', label: 'Erstellte Angebote', icon: FileText },
      { value: 4800, suffix: '+', label: 'Aktive Nutzer', icon: Users },
      { value: 67, suffix: '%', label: 'Durchschn. Akzeptanzrate', icon: TrendingUp },
      { value: 50, suffix: '+', label: 'Unterstützte Sprachen', icon: Globe },
    ],
  },
  fr: {
    stats: [
      { value: 12500, suffix: '+', label: 'Propositions générées', icon: FileText },
      { value: 4800, suffix: '+', label: 'Utilisateurs actifs', icon: Users },
      { value: 67, suffix: '%', label: "Taux d'acceptation moy.", icon: TrendingUp },
      { value: 50, suffix: '+', label: 'Langues supportées', icon: Globe },
    ],
  },
};

const AnimatedCounter = ({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient-gold tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
};

export const StatsCounterSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 md:py-20 bg-card/50 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-5xl mx-auto">
          {t.stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={inView} />
                <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
