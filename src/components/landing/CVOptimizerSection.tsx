import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { FileText, Upload, Sparkles, Download, Target, CheckCircle, ArrowRight } from 'lucide-react';

export const CVOptimizerSection = () => {
  const { language } = useLanguage();

  const txt = {
    badge: language === 'tr' ? '✨ YENİ ÖZELLİK' : language === 'de' ? '✨ NEUES FEATURE' : language === 'fr' ? '✨ NOUVELLE FONCTIONNALITÉ' : '✨ NEW FEATURE',
    title: language === 'tr' ? 'Ücretsiz şablonlar boş kutu ve ret verir.' : language === 'de' ? 'Kostenlose Templates füllen Kästchen, und bringen Absagen.' : language === 'fr' ? 'Les modèles gratuits remplissent des cases. Et mènent au refus.' : 'Free templates give you empty boxes and rejections.',
    subtitle: language === 'tr'
      ? 'Sovereign 10 saniyede mülakatı verir.'
      : language === 'de'
      ? 'Sovereign bringt dir das Interview in 10 Sekunden.'
      : language === 'fr'
      ? 'Sovereign vous donne l\'entretien en 10 secondes.'
      : 'Sovereign gives you the interview in 10 seconds.',
    steps: [
      {
        icon: Upload,
        title: language === 'tr' ? 'Yükle veya Yapıştır' : language === 'de' ? 'Hochladen oder Einfügen' : language === 'fr' ? 'Télécharger ou Coller' : 'Upload or Paste',
        desc: language === 'tr' ? 'PDF, DOCX veya metin olarak CV\'nizi girin' : language === 'de' ? 'CV als PDF, DOCX oder Text eingeben' : language === 'fr' ? 'Entrez votre CV en PDF, DOCX ou texte' : 'Enter your CV as PDF, DOCX, or text',
      },
      {
        icon: Sparkles,
        title: language === 'tr' ? 'İşveren diline çevir' : language === 'de' ? 'Für den Recruiter schreiben' : language === 'fr' ? 'Écrire pour le recruteur' : 'Make it hireable',
        desc: language === 'tr' ? 'Güçlü eylem kelimeleri, metrikler ve ATS uyumu' : language === 'de' ? 'Starke Aktionswörter, Metriken und ATS-Kompatibilität' : language === 'fr' ? 'Verbes d\'action puissants, métriques et compatibilité ATS' : 'Strong action verbs, metrics & ATS compatibility',
      },
      {
        icon: Download,
        title: language === 'tr' ? 'İndir' : language === 'de' ? 'Herunterladen' : language === 'fr' ? 'Télécharger' : 'Download',
        desc: language === 'tr' ? 'PDF veya TXT olarak optimize edilmiş CV\'nizi alın' : language === 'de' ? 'Optimierten CV als PDF oder TXT erhalten' : language === 'fr' ? 'Obtenez votre CV optimisé en PDF ou TXT' : 'Get your optimized CV as PDF or TXT',
      },
    ],
    features: [
      language === 'tr' ? 'ATS uyumlu anahtar kelimeler' : language === 'de' ? 'ATS-kompatible Schlüsselwörter' : language === 'fr' ? 'Mots-clés compatibles ATS' : 'ATS-optimized keywords',
      language === 'tr' ? 'Ölçülebilir başarılar' : language === 'de' ? 'Messbare Erfolge' : language === 'fr' ? 'Réalisations mesurables' : 'Quantified achievements',
      language === 'tr' ? 'Profesyonel yapı' : language === 'de' ? 'Professionelle Struktur' : language === 'fr' ? 'Structure professionnelle' : 'Professional structure',
      language === 'tr' ? 'Hedef pozisyona özel' : language === 'de' ? 'Auf Zielposition zugeschnitten' : language === 'fr' ? 'Adapté au poste ciblé' : 'Tailored to target role',
    ],
    cta: language === 'tr' ? 'CV\'mi Optimize Et' : language === 'de' ? 'Meinen CV optimieren' : language === 'fr' ? 'Optimiser mon CV' : 'Optimize My CV',
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Badge */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
            {txt.badge}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          {txt.title}
        </h2>
        <p className="text-base md:text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          {txt.subtitle}
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {txt.steps.map((step, i) => (
            <div key={i} className="relative group">
              <div className="rounded-2xl border border-border bg-card p-6 text-center hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 h-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">
                  {language === 'tr' ? `ADIM ${i + 1}` : language === 'de' ? `SCHRITT ${i + 1}` : language === 'fr' ? `ÉTAPE ${i + 1}` : `STEP ${i + 1}`}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
              {/* Arrow between steps (desktop only) */}
              {i < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {txt.features.map((feat, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm text-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              {feat}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/cv-builder">
            <Button variant="gold" size="lg" className="gap-2 text-base px-8">
              <FileText className="w-5 h-5" />
              {txt.cta}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
