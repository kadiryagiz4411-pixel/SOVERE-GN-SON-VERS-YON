import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Crown, Sparkles, BarChart3, ArrowRight, Target, Zap } from 'lucide-react';
import { getCheckoutUrl } from '@/lib/plans';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

const tabs = [
  {
    id: 'free',
    icon: Sparkles,
    labels: { en: 'Free Plan', tr: 'Ücretsiz Plan', de: 'Kostenlos', fr: 'Gratuit' },
    activeBg: 'bg-muted',
  },
  {
    id: 'pro',
    icon: BarChart3,
    labels: { en: 'Pro Plan', tr: 'Pro Plan', de: 'Pro Plan', fr: 'Plan Pro' },
    activeBg: 'bg-primary',
  },
  {
    id: 'elite',
    icon: Crown,
    labels: { en: 'Elite Plan', tr: 'Elite Plan', de: 'Elite Plan', fr: 'Plan Elite' },
    activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
  },
];

type Lang = 'en' | 'tr' | 'de' | 'fr';

type LocalizedString = Record<Lang, string>;

interface MockData {
  title: LocalizedString;
  desc: LocalizedString;
  badge: LocalizedString;
  badgeColor: string;
  features: { label: LocalizedString; icon: string }[];
  input: LocalizedString;
  output: LocalizedString;
  score: number | null;
}

const mockScreenshots: Record<string, MockData> = {
  free: {
    title: {
      en: 'Basic Proposal Generator',
      tr: 'Temel Teklif Üretici',
      de: 'Einfacher Angebots-Generator',
      fr: 'Générateur de base',
    },
    desc: {
      en: 'Generate solid proposals. No acceptance score. No strategy.',
      tr: 'Sağlam teklifler üretin. Kabul skoru yok. Strateji yok.',
      de: 'Solide Angebote erstellen. Kein Akzeptanz-Score. Keine Strategie.',
      fr: 'Générez des propositions solides. Pas de score. Pas de stratégie.',
    },
    badge: { en: 'Free', tr: 'Ücretsiz', de: 'Kostenlos', fr: 'Gratuit' },
    badgeColor: 'bg-muted text-muted-foreground',
    features: [
      { label: { en: '10 proposals/day', tr: 'Günde 10 teklif', de: '10 Angebote/Tag', fr: '10 propositions/jour' }, icon: '📄' },
      { label: { en: 'Basic text generation', tr: 'Temel metin üretimi', de: 'Einfache Textgenerierung', fr: 'Génération de texte basique' }, icon: '✍️' },
      { label: { en: '3 downloads/day', tr: 'Günde 3 indirme', de: '3 Downloads/Tag', fr: '3 téléchargements/jour' }, icon: '📥' },
    ],
    input: {
      en: 'Frontend Developer needed for SaaS product...',
      tr: 'SaaS ürünü için Frontend Developer aranıyor...',
      de: 'Frontend-Entwickler für SaaS-Produkt gesucht...',
      fr: 'Développeur Frontend recherché pour produit SaaS...',
    },
    output: {
      en: 'I noticed your team is looking for a Frontend Developer. With my 3 years of React experience, I have built responsive interfaces for multiple SaaS products...',
      tr: 'Ekibinizin bir Frontend Developer aradığını fark ettim. 3 yıllık React deneyimimle, birçok SaaS ürünü için duyarlı arayüzler inşa ettim...',
      de: 'Ich habe bemerkt, dass Ihr Team einen Frontend-Entwickler sucht. Mit meiner 3-jährigen React-Erfahrung habe ich responsive Interfaces für mehrere SaaS-Produkte entwickelt...',
      fr: 'J\'ai remarqué que votre équipe recherche un développeur Frontend. Avec mes 3 ans d\'expérience React, j\'ai créé des interfaces responsives pour plusieurs produits SaaS...',
    },
    score: null,
  },
  pro: {
    title: {
      en: 'Acceptance Probability Score',
      tr: 'Kabul Olasılığı Skoru',
      de: 'Akzeptanzwahrscheinlichkeits-Score',
      fr: 'Score de probabilité d\'acceptation',
    },
    desc: {
      en: 'Know your chances before you apply. Optimize your proposal based on real data.',
      tr: 'Başvurmadan önce şansınızı öğrenin. Gerçek verilere dayalı teklif optimizasyonu.',
      de: 'Kennen Sie Ihre Chancen, bevor Sie sich bewerben. Optimierung basierend auf echten Daten.',
      fr: 'Connaissez vos chances avant de postuler. Optimisez votre candidature avec de vraies données.',
    },
    badge: { en: 'Pro', tr: 'Pro', de: 'Pro', fr: 'Pro' },
    badgeColor: 'bg-primary/20 text-primary',
    features: [
      { label: { en: 'Unlimited proposals', tr: 'Sınırsız teklif', de: 'Unbegrenzte Angebote', fr: 'Propositions illimitées' }, icon: '♾️' },
      { label: { en: 'Acceptance % score', tr: 'Kabul % skoru', de: 'Akzeptanz %-Score', fr: 'Score d\'acceptation %' }, icon: '📊' },
      { label: { en: '4 tone variants', tr: '4 ton varyantı', de: '4 Ton-Varianten', fr: '4 variantes de ton' }, icon: '🎯' },
    ],
    input: {
      en: 'Senior React Developer — $80k-$120k, Remote',
      tr: 'Kıdemli React Developer — $80k-$120k, Uzaktan',
      de: 'Senior React-Entwickler — $80k-$120k, Remote',
      fr: 'Développeur React Senior — $80k-$120k, Télétravail',
    },
    output: {
      en: 'Your emphasis on performance optimization caught my attention — I led a migration that cut bundle size by 45% and improved Lighthouse scores from 62 to 94...',
      tr: 'Performans optimizasyonuna verdiğiniz önem dikkatimi çekti — bundle boyutunu %45 azaltan ve Lighthouse puanlarını 62\'den 94\'e yükselten bir migrasyon yürüttüm...',
      de: 'Ihr Fokus auf Performance-Optimierung hat meine Aufmerksamkeit geweckt — ich leitete eine Migration, die die Bundle-Größe um 45% reduzierte und Lighthouse-Scores von 62 auf 94 verbesserte...',
      fr: 'Votre accent sur l\'optimisation des performances a retenu mon attention — j\'ai dirigé une migration qui a réduit la taille du bundle de 45% et amélioré les scores Lighthouse de 62 à 94...',
    },
    score: 67,
  },
  elite: {
    title: {
      en: 'Full Strategy + Company Intel',
      tr: 'Tam Strateji + Şirket Analizi',
      de: 'Vollständige Strategie + Firmenanalyse',
      fr: 'Stratégie complète + Analyse d\'entreprise',
    },
    desc: {
      en: 'Decision-maker names, outreach messages, visual acceptance graphs, and direct apply links.',
      tr: 'Karar verici isimleri, doğrudan mesajlar, görsel kabul grafikleri ve doğrudan başvuru linkleri.',
      de: 'Entscheider-Namen, Outreach-Nachrichten, visuelle Akzeptanzgraphen und direkte Bewerbungslinks.',
      fr: 'Noms des décideurs, messages de prospection, graphiques visuels et liens de candidature directe.',
    },
    badge: { en: 'Elite', tr: 'Elite', de: 'Elite', fr: 'Elite' },
    badgeColor: 'bg-amber-500/20 text-amber-500',
    features: [
      { label: { en: 'Company decision makers', tr: 'Şirket karar vericileri', de: 'Unternehmens-Entscheider', fr: 'Décideurs de l\'entreprise' }, icon: '👤' },
      { label: { en: 'Direct apply links', tr: 'Doğrudan başvuru linki', de: 'Direkte Bewerbungslinks', fr: 'Liens de candidature directe' }, icon: '🔗' },
      { label: { en: 'Outreach messages', tr: 'Hazır mesajlar', de: 'Outreach-Nachrichten', fr: 'Messages de prospection' }, icon: '📨' },
    ],
    input: {
      en: 'Notion — Frontend Engineer, San Francisco / Remote',
      tr: 'Notion — Frontend Mühendisi, San Francisco / Uzaktan',
      de: 'Notion — Frontend Engineer, San Francisco / Remote',
      fr: 'Notion — Ingénieur Frontend, San Francisco / Télétravail',
    },
    output: {
      en: 'The intersection of real-time collaboration and performance you\'re tackling is exactly where I\'ve spent 4 years. I rebuilt a dashboard serving 50K daily users, achieving sub-100ms render times...',
      tr: 'Gerçek zamanlı iş birliği ve performansın kesişim noktası, son 4 yılımı geçirdiğim yer. 50K günlük kullanıcıya hizmet eden bir panoyu yeniden inşa ederek 100ms\'nin altında yükleme süreleri elde ettim...',
      de: 'Die Schnittstelle aus Echtzeit-Zusammenarbeit und Performance, mit der Sie sich befassen, ist genau dort, wo ich 4 Jahre verbracht habe. Ich habe ein Dashboard neu aufgebaut, das 50K tägliche Nutzer bedient...',
      fr: 'L\'intersection entre collaboration en temps réel et performance que vous abordez est exactement là où j\'ai passé 4 ans. J\'ai reconstruit un tableau de bord servant 50K utilisateurs quotidiens avec des temps de rendu inférieurs à 100ms...',
    },
    score: 71,
  },
};

const uiText: Record<Lang, {
  badge: string;
  title: string;
  subtitle: string;
  jobLabel: string;
  proposalLabel: string;
  acceptance: string;
  applyLink: string;
  decisionMaker: string;
  outreach: string;
  startFree: string;
  getPro: string;
  getElite: string;
}> = {
  en: {
    badge: 'App Preview',
    title: 'See Exactly What You Get',
    subtitle: 'No marketing fluff. This is the actual product experience across all tiers.',
    jobLabel: 'Job Description / Project',
    proposalLabel: 'Generated Proposal',
    acceptance: 'acceptance',
    applyLink: '🔗 Apply to Notion →',
    decisionMaker: '👤 Head of Engineering: Alex Chen',
    outreach: '📨 LinkedIn message ready to send',
    startFree: 'Start Free →',
    getPro: 'Get Pro →',
    getElite: 'Go Elite →',
  },
  tr: {
    badge: 'Uygulama Önizleme',
    title: 'Tam Olarak Ne Alacağınızı Görün',
    subtitle: 'Pazarlama saçmalığı yok. Bu, tüm katmanlarda gerçek ürün deneyimi.',
    jobLabel: 'İş İlanı / Proje',
    proposalLabel: 'Üretilen Teklif',
    acceptance: 'kabul',
    applyLink: '🔗 Notion\'a Başvur →',
    decisionMaker: '👤 Mühendislik Müdürü: Alex Chen',
    outreach: '📨 LinkedIn mesajı göndermeye hazır',
    startFree: 'Ücretsiz Başla →',
    getPro: 'Pro\'ya Geç →',
    getElite: 'Elite\'e Yükselt →',
  },
  de: {
    badge: 'App-Vorschau',
    title: 'Sehen Sie genau, was Sie bekommen',
    subtitle: 'Kein Marketing-Blabla. Dies ist die echte Produkterfahrung für alle Stufen.',
    jobLabel: 'Stellenbeschreibung / Projekt',
    proposalLabel: 'Generiertes Angebot',
    acceptance: 'Akzeptanz',
    applyLink: '🔗 Bei Notion bewerben →',
    decisionMaker: '👤 Leiter Engineering: Alex Chen',
    outreach: '📨 LinkedIn-Nachricht versandbereit',
    startFree: 'Kostenlos starten →',
    getPro: 'Pro holen →',
    getElite: 'Elite werden →',
  },
  fr: {
    badge: 'Aperçu de l\'app',
    title: 'Voyez exactement ce que vous obtenez',
    subtitle: 'Pas de blabla marketing. C\'est l\'expérience produit réelle sur tous les niveaux.',
    jobLabel: 'Description du poste / Projet',
    proposalLabel: 'Proposition générée',
    acceptance: 'acceptation',
    applyLink: '🔗 Postuler chez Notion →',
    decisionMaker: '👤 Responsable Ingénierie : Alex Chen',
    outreach: '📨 Message LinkedIn prêt à envoyer',
    startFree: 'Commencer gratuitement →',
    getPro: 'Passer à Pro →',
    getElite: 'Passer Elite →',
  },
};

export const AppScreenshotsSection = () => {
  const { language } = useLanguage();
  const lang = (language as Lang) in uiText ? (language as Lang) : 'en';
  const [activeTab, setActiveTab] = useState<'free' | 'pro' | 'elite'>('pro');
  const data = mockScreenshots[activeTab];
  const s = uiText[lang];

  const ctaMap = {
    free: { link: '/auth?mode=signup', label: s.startFree, isExternal: false },
    pro: { link: getCheckoutUrl('pro'), label: s.getPro, isExternal: true },
    elite: { link: getCheckoutUrl('elite'), label: s.getElite, isExternal: true },
  };

  const L = (obj: LocalizedString) => obj[lang] ?? obj.en;

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{s.badge}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{s.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{s.subtitle}</p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center gap-2 mb-10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'free' | 'pro' | 'elite')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? tab.id === 'elite'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                      : tab.id === 'pro'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-foreground'
                    : 'border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {L(tab.labels)}
              </button>
            );
          })}
        </div>

        {/* Mock App UI */}
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 ${
            activeTab === 'elite'
              ? 'border-amber-500/40'
              : activeTab === 'pro'
              ? 'border-primary/40'
              : 'border-border'
          }`}>
            {/* Mock Browser Bar */}
            <div className="bg-muted/80 px-4 py-3 flex items-center gap-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 bg-background/60 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                app.sovereign.ai/dashboard
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${data.badgeColor}`}>
                {L(data.badge)}
              </span>
            </div>

            {/* Mock App Content */}
            <div className="bg-background grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
              {/* Left: Input */}
              <div className="p-6 border-r border-border">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {s.jobLabel}
                </div>
                <div className="rounded-xl border border-border bg-card p-4 mb-4 text-sm text-muted-foreground leading-relaxed">
                  {L(data.input)}
                </div>

                {/* Feature tags */}
                <div className="space-y-2">
                  {data.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>{f.icon}</span>
                      <span className="text-foreground">{L(f.label)}</span>
                    </div>
                  ))}
                </div>

                {/* Elite extras */}
                {activeTab === 'elite' && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      {s.decisionMaker}
                    </div>
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                      {s.outreach}
                    </div>
                    <CheckoutButton
                      href={getCheckoutUrl('elite')}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 transition-colors h-auto justify-start"
                    >
                      {s.applyLink}
                    </CheckoutButton>
                  </div>
                )}
              </div>

              {/* Right: Output */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {s.proposalLabel}
                  </div>
                  {data.score && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{data.score}%</span>
                      <span className="text-xs text-muted-foreground">{s.acceptance}</span>
                    </div>
                  )}
                </div>

                {/* Score bar for pro/elite */}
                {data.score && (
                  <div className="mb-4">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          activeTab === 'elite'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">0%</span>
                      <span className="text-[10px] text-muted-foreground">100%</span>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground leading-relaxed line-clamp-6">
                  {L(data.output)}
                </div>

                {/* Title & description */}
                <div className="mt-4">
                  <h3 className="font-semibold text-foreground text-sm">
                    {L(data.title)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {L(data.desc)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <CheckoutButton href={ctaMap[activeTab].link} variant={activeTab === 'free' ? 'outline' : 'gold'} size="lg" className="group">
              {ctaMap[activeTab].label}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </CheckoutButton>
          </div>
        </div>
      </div>
    </section>
  );
};
