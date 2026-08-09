import { motion } from 'framer-motion';
import { Shield, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const companies = ['Google', 'Amazon', 'Deloitte', 'Meta', 'McKinsey', 'Microsoft'];
const platforms = ['Upwork', 'Fiverr', 'Freelancer', 'LinkedIn'];

const translations = {
  en: {
    trustedBy: 'Trusted by professionals landing roles at',
    worksOn: 'Optimized for',
    privacy: 'Privacy First',
    ats: 'ATS-Compliant',
    gdpr: 'GDPR Ready',
  },
  tr: {
    trustedBy: 'Bu şirketlerde pozisyon kazanan profesyonellerin tercihi',
    worksOn: 'Optimize edilmiş',
    privacy: 'Gizlilik Öncelikli',
    ats: 'ATS Uyumlu',
    gdpr: 'GDPR Hazır',
  },
  de: {
    trustedBy: 'Vertraut von Profis, die Rollen gewonnen haben bei',
    worksOn: 'Optimiert für',
    privacy: 'Datenschutz zuerst',
    ats: 'ATS-konform',
    gdpr: 'DSGVO-bereit',
  },
  fr: {
    trustedBy: 'Utilisé par des professionnels embauchés chez',
    worksOn: 'Optimisé pour',
    privacy: 'Confidentialité',
    ats: 'Compatible ATS',
    gdpr: 'Conforme RGPD',
  },
};

export const TrustStripSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <section className="py-12 md:py-16 bg-card/30 border-y border-border">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          {/* Platform strip */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">{t.worksOn}:</span>
            {platforms.map((name) => (
              <span
                key={name}
                className="px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary"
              >
                {name}
              </span>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8">
            {t.trustedBy}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
            {companies.map((name) => (
              <span
                key={name}
                className="text-lg md:text-xl font-semibold text-muted-foreground/40 tracking-wide select-none"
              >
                {name}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>{t.privacy}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>{t.ats}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>{t.gdpr}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
