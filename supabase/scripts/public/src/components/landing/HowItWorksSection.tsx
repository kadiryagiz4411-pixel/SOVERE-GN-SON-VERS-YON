import { FileText, Cpu, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const translations = {
  en: {
    title: 'How It Works',
    subtitle: 'Three steps to a smarter application.',
    steps: [
      { step: '01', title: 'Enter Role + Target', description: 'Paste the job listing or select your freelance platform and profession.' },
      { step: '02', title: 'AI Analyzes & Optimizes', description: 'Our engine matches your profile against the role, platform, and competition level.' },
      { step: '03', title: 'Get Score & Apply Smarter', description: 'See your acceptance probability, improvement suggestions, and apply with confidence.' },
    ],
  },
  tr: {
    title: 'Nasıl Çalışır',
    subtitle: 'Daha akıllı başvurular için üç adım.',
    steps: [
      { step: '01', title: 'Rol + Hedef Girin', description: 'İş ilanını yapıştırın veya freelance platformunuzu ve mesleğinizi seçin.' },
      { step: '02', title: 'Yapay Zeka Analiz Eder', description: 'Motorumuz profilinizi rol, platform ve rekabet seviyesiyle eşleştirir.' },
      { step: '03', title: 'Skor Al ve Akıllıca Başvur', description: 'Kabul olasılığınızı, iyileştirme önerilerinizi görün ve güvenle başvurun.' },
    ],
  },
  de: {
    title: 'So funktioniert es',
    subtitle: 'Drei Schritte zu einer klügeren Bewerbung.',
    steps: [
      { step: '01', title: 'Rolle + Ziel eingeben', description: 'Fügen Sie die Stellenanzeige ein oder wählen Sie Ihre Freelance-Plattform und Ihren Beruf.' },
      { step: '02', title: 'KI analysiert & optimiert', description: 'Unsere Engine gleicht Ihr Profil mit der Rolle, Plattform und dem Wettbewerbsniveau ab.' },
      { step: '03', title: 'Score erhalten & klüger bewerben', description: 'Sehen Sie Ihre Akzeptanzwahrscheinlichkeit, Verbesserungsvorschläge und bewerben Sie sich mit Vertrauen.' },
    ],
  },
  fr: {
    title: 'Comment ça marche',
    subtitle: 'Trois étapes vers une candidature plus intelligente.',
    steps: [
      { step: '01', title: 'Entrez le rôle + la cible', description: 'Collez l\'offre d\'emploi ou sélectionnez votre plateforme freelance et votre profession.' },
      { step: '02', title: 'L\'IA analyse et optimise', description: 'Notre moteur compare votre profil au rôle, à la plateforme et au niveau de concurrence.' },
      { step: '03', title: 'Obtenez le score et postulez', description: 'Voyez votre probabilité d\'acceptation, les suggestions d\'amélioration et postulez avec confiance.' },
    ],
  },
};

const stepIcons = [FileText, Cpu, BarChart3];

export const HowItWorksSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <section className="py-20 bg-card relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {t.steps.map((s, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary mb-2 tracking-widest">{s.step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
