import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { ArrowRight, Sparkles, Shield, Target, Download, FileText, Briefcase, Building2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { motion } from 'framer-motion';
import { SafeIcon } from '@/lib/safeIcon';

const translations = {
  en: {
    badge: 'AI Proposal & B2B Pitch Generator — Win More Clients',
    headline1: 'Win more clients with',
    headline2: 'AI-crafted proposals.',
    headline3: '',
    subtitle: 'Sovereign is an AI-powered proposal & B2B pitch generator for agencies and freelancers. Create high-converting pitches, optimize CVs for ATS, and land more contracts — 3× faster.',
    ctaApplication: 'Generate New Proposal',
    ctaCV: 'ATS CV Builder',
    downloadApp: 'Download App',
    microtext: 'No credit card required · 15 daily proposals + ATS CV optimization',
    platformLabel: 'Works with',
    signals: [
      'High-Converting Proposals',
      'B2B Agency Pitches',
      'ATS-Optimized CVs',
      'Acceptance Prediction',
    ],
  },
  tr: {
    badge: 'Yapay Zeka Destekli Freelance & İş Başvuru Motoru',
    headline1: 'Connect\'lerinizi Boşa Harcamayı',
    headline2: 'Bırakın, İş Kazanın.',
    headline3: '',
    subtitle: 'Upwork, Fiverr ve Freelancer\'da yapay zeka ile optimize edilmiş tekliflerle daha fazla müşteri kazanın. Kurumsal başvurularınızı da ATS uyumlu CV\'lerle ezin. Daha az başvuru, daha çok kazanç.',
    ctaApplication: 'Kazanan Teklif Oluştur',
    ctaCV: 'ATS CV Oluştur',
    downloadApp: 'Uygulamayı İndir',
    microtext: 'Kredi kartı gerekmez · 15 günlük teklif + 1 ücretsiz CV',
    platformLabel: 'Uyumlu platformlar',
    signals: [
      'Upwork & Fiverr uyumlu',
      '50+ dil desteği',
      'Kurumsal ATS uyumlu CV\'ler',
      'Kabul tahmini',
    ],
  },
  de: {
    badge: 'KI-gestützte Freelance- & Bewerbungs-Engine',
    headline1: 'Verschwenden Sie keine Connects',
    headline2: '& Gewinnen Sie Jobs.',
    headline3: '',
    subtitle: 'Gewinnen Sie mehr Kunden auf Upwork, Fiverr & Freelancer mit KI-optimierten Angeboten. Meistern Sie auch Firmenbewerbungen mit ATS-optimierten CVs. Weniger Bewerbungen, mehr Erfolge.',
    ctaApplication: 'Gewinnendes Angebot erstellen',
    ctaCV: 'ATS CV erstellen',
    downloadApp: 'App herunterladen',
    microtext: 'Keine Kreditkarte · 15 tägliche Angebote + 1 kostenloser CV',
    platformLabel: 'Kompatibel mit',
    signals: [
      'Upwork & Fiverr optimiert',
      '50+ Sprachen',
      'Unternehmens-ATS-CVs',
      'Akzeptanzvorhersage',
    ],
  },
  fr: {
    badge: 'Moteur IA de Candidature Freelance & Emploi',
    headline1: 'Arrêtez de gaspiller vos Connects',
    headline2: '& Gagnez plus de missions.',
    headline3: '',
    subtitle: 'Gagnez plus de clients sur Upwork, Fiverr & Freelancer avec des propositions optimisées par l\'IA. Réussissez aussi les candidatures corporate avec des CVs ATS. Moins de candidatures, plus de résultats.',
    ctaApplication: 'Générer une proposition gagnante',
    ctaCV: 'Créer un CV ATS',
    downloadApp: 'Télécharger l\'app',
    microtext: 'Aucune carte requise · 15 propositions/jour + 1 CV gratuit',
    platformLabel: 'Compatible avec',
    signals: [
      'Optimisé Upwork & Fiverr',
      '50+ langues',
      'CVs ATS corporate',
      'Prédiction d\'acceptation',
    ],
  },
};

const platforms = [
  { name: 'Upwork', color: 'from-green-500/20 to-green-600/20 border-green-500/30' },
  { name: 'Fiverr', color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' },
  { name: 'Freelancer', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30' },
  { name: 'LinkedIn', color: 'from-sky-500/20 to-sky-600/20 border-sky-500/30' },
  { name: 'Direct B2B', color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30' },
];

const signalIcons = [Briefcase, Building2, Shield, Target];

export const HeroSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const handleCTAClick = () => {
    trackEvent('cta_click', { label: 'hero_primary', source: 'landing' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#09090b] pt-24 md:pt-32 pb-16">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-zinc-800" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-amber-400 mb-8"
          >
            <span className="font-mono text-[10px] tracking-[0.22em]">SYS.01</span>
            <span className="h-3 w-px bg-zinc-700" />
            <span className="text-xs font-medium tracking-wide text-zinc-200">{t.badge}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.02] mb-6 tracking-tight"
          >
            <span className="text-foreground">{t.headline1}</span>
            <br />
            <span className="text-gradient-gold">{t.headline2}</span>
            {t.headline3 && <><br /><span className="text-foreground">{t.headline3}</span></>}
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            {t.subtitle}
          </motion.p>

          {/* Platform Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-10"
          >
            <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 mr-1">{t.platformLabel.toUpperCase()}</span>
            {platforms.map((p, i) => (
              <motion.span
                key={p.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.35 + i * 0.05 }}
                className="inline-flex items-center border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 font-mono text-[11px] tracking-wide text-zinc-300"
              >
                {p.name}
              </motion.span>
            ))}
          </motion.div>

          {/* Primary CTA */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center gap-4 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link to="/dashboard" onClick={handleCTAClick} className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="group text-base sm:text-lg px-10 py-6 h-auto w-full sm:w-auto">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t.ctaApplication}
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/cv-builder" onClick={() => trackEvent('cta_click', { label: 'hero_cv', source: 'landing' })} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="group text-base px-8 py-5 h-auto w-full sm:w-auto border-primary/30 hover:border-primary">
                  <FileText className="w-4 h-4 mr-2 text-primary" />
                  {t.ctaCV}
                </Button>
              </Link>
            </div>
            <Link to="/install">
              <Button variant="ghost" size="sm" className="h-9 px-4 gap-2 text-xs text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t.downloadApp}
              </Button>
            </Link>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            {t.microtext}
          </p>

          {/* Trust Signals */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 grid grid-cols-2 gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-4"
          >
            {t.signals.map((text, i) => {
              return (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                  className="flex items-center gap-2 bg-[#09090b] px-4 py-3 text-left text-xs text-zinc-400"
                >
                  <SafeIcon icon={signalIcons[i]} fallback={Sparkles} className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{text}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-10 w-6 items-start justify-center border border-zinc-700 p-1.5">
          <div className="h-3 w-px bg-amber-400 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
};
