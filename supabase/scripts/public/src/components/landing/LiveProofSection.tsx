import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { Crown, Sparkles, Check, BarChart3, Building2, Target, ArrowRight, ExternalLink, MapPin } from 'lucide-react';
import { getCheckoutUrl } from '@/lib/plans';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

const RADAR_KEYS: Record<string, Record<string, string>> = {
  en: { Relevance: 'Relevance', Tone: 'Tone', Experience: 'Experience', Skills: 'Skills', Originality: 'Originality', CTA: 'CTA' },
  tr: { Relevance: 'Uyum', Tone: 'Ton', Experience: 'Deneyim', Skills: 'Beceriler', Originality: 'Özgünlük', CTA: 'CTA' },
  de: { Relevance: 'Relevanz', Tone: 'Ton', Experience: 'Erfahrung', Skills: 'Fähigkeiten', Originality: 'Originalität', CTA: 'CTA' },
  fr: { Relevance: 'Pertinence', Tone: 'Ton', Experience: 'Expérience', Skills: 'Compétences', Originality: 'Originalité', CTA: 'CTA' },
};

const BASE_RADAR_DATA = [
  { metric: 'Relevance', value: 92 },
  { metric: 'Tone', value: 85 },
  { metric: 'Experience', value: 88 },
  { metric: 'Skills', value: 95 },
  { metric: 'Originality', value: 78 },
  { metric: 'CTA', value: 90 },
];

// Global pool of real growing companies — randomized per session, no Turkish bias
const ALL_COMPANIES = [
  {
    name: 'Notion',
    role: 'Frontend Engineer',
    location: 'San Francisco / Remote',
    pct: 71,
    reason: { en: 'Your React component architecture experience is a strong match for their collaborative editor team.', tr: 'React komponent mimarisi deneyimin, işbirlikçi editör ekipleriyle güçlü bir uyum sağlıyor.' },
    action: { en: 'Perfect match — apply now', tr: 'Tam sana göre — hemen başvur' },
    logo: '📝',
  },
  {
    name: 'Linear',
    role: 'Full Stack Engineer',
    location: 'Remote (US/EU)',
    pct: 68,
    reason: { en: 'Your experience with real-time sync and performant UIs aligns with their product-engineering culture.', tr: 'Gerçek zamanlı senkronizasyon ve performanslı UI deneyimin, ürün-mühendislik kültürleriyle örtüşüyor.' },
    action: { en: 'Great fit for you', tr: 'Bu ilan sana uygun' },
    logo: '⚡',
  },
  {
    name: 'Figma',
    role: 'Software Engineer',
    location: 'San Francisco / London',
    pct: 65,
    reason: { en: 'Your canvas rendering and performance optimization skills are ideal for their design tool platform.', tr: 'Canvas rendering ve performans optimizasyonu becerilerin, tasarım aracı platformu için ideal.' },
    action: { en: 'Apply directly', tr: 'Direkt başvur' },
    logo: '🎨',
  },
  {
    name: 'Vercel',
    role: 'Developer Experience Engineer',
    location: 'Remote (Global)',
    pct: 72,
    reason: { en: 'Your deep frontend tooling knowledge and open-source contributions make you a natural fit.', tr: 'Derin frontend araç bilgin ve açık kaynak katkıların seni doğal bir aday yapıyor.' },
    action: { en: 'This company needs you', tr: 'Bu şirket tam sana göre' },
    logo: '▲',
  },
  {
    name: 'Supabase',
    role: 'Frontend Developer',
    location: 'Remote (Global)',
    pct: 67,
    reason: { en: 'Your full-stack React and database experience matches their developer-tools mission.', tr: 'Full-stack React ve veritabanı deneyimin, geliştirici araçları misyonlarıyla örtüşüyor.' },
    action: { en: 'Strong match', tr: 'Güçlü uyum — başvur' },
    logo: '🟢',
  },
  {
    name: 'PostHog',
    role: 'Product Engineer',
    location: 'Remote (EU/US)',
    pct: 63,
    reason: { en: 'Your analytics dashboard and data visualization experience is exactly what their product team seeks.', tr: 'Analitik panel ve veri görselleştirme deneyimin, ürün ekiplerinin aradığı şey.' },
    action: { en: 'Worth exploring', tr: 'İncele ve başvur' },
    logo: '🦔',
  },
  {
    name: 'Raycast',
    role: 'React Developer',
    location: 'Remote (EU)',
    pct: 64,
    reason: { en: 'Your expertise in building fast, keyboard-driven interfaces is a great match for their launcher product.', tr: 'Hızlı, klavye odaklı arayüz geliştirme uzmanlığın, launcher ürünleri için harika bir uyum.' },
    action: { en: 'Check this out', tr: 'Göz at' },
    logo: '🔍',
  },
  {
    name: 'Cal.com',
    role: 'Full Stack Developer',
    location: 'Remote (Global)',
    pct: 62,
    reason: { en: 'Your scheduling UX and API integration experience aligns perfectly with their open-source platform.', tr: 'Zamanlama UX ve API entegrasyon deneyimin, açık kaynak platformlarıyla birebir örtüşüyor.' },
    action: { en: 'Apply now', tr: 'Hemen başvur' },
    logo: '📅',
  },
  {
    name: 'Doist',
    role: 'Frontend Engineer',
    location: 'Remote (Async)',
    pct: 61,
    reason: { en: 'Your async collaboration and clean code philosophy matches their fully remote, async-first culture.', tr: 'Asenkron iş birliği ve temiz kod felsefin, tamamen uzaktan çalışma kültürleriyle uyumlu.' },
    action: { en: 'Worth a look', tr: 'Göz at' },
    logo: '✅',
  },
  {
    name: 'Resend',
    role: 'Software Engineer',
    location: 'San Francisco / Remote',
    pct: 69,
    reason: { en: 'Your email infrastructure and React component library experience is a natural fit for their dev-tools team.', tr: 'E-posta altyapısı ve React komponent kütüphanesi deneyimin, geliştirici araçları ekibine doğal bir uyum.' },
    action: { en: 'Perfect for you', tr: 'Tam sana göre' },
    logo: '📧',
  },
  {
    name: 'Lemon Squeezy',
    role: 'Frontend Developer',
    location: 'Remote (Global)',
    pct: 60,
    reason: { en: 'Your e-commerce checkout flow experience and payment UI knowledge are exactly what they need.', tr: 'E-ticaret ödeme akışı deneyimin ve ödeme UI bilgin tam aradıkları şey.' },
    action: { en: 'Review and apply', tr: 'İncele ve başvur' },
    logo: '🍋',
  },
  {
    name: 'Planetscale',
    role: 'Developer Advocate',
    location: 'Remote (US/EU)',
    pct: 59,
    reason: { en: 'Your technical writing and database experience make you ideal for bridging engineering and community.', tr: 'Teknik yazarlık ve veritabanı deneyimin, mühendislik ve topluluk arasında köprü kurmak için ideal.' },
    action: { en: 'Explore this role', tr: 'Bu rolü keşfet' },
    logo: '🪐',
  },
];

// Shuffle and pick N companies (session-stable via useMemo)
function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const sectionText = {
  en: {
    badge: 'Live Output Preview',
    title: 'See the Difference in',
    titleHighlight: 'Real Output',
    subtitle: 'Compare actual proposal quality across tiers. This is what you get — no filters, no edits.',
    eliteOutput: 'Elite Output',
    proOutput: 'Pro Output',
    freeOutput: 'Free Output',
    strengthAnalysis: 'Application Strength Analysis',
    companyRecs: 'Company Recommendations For You',
    getElite: 'Get Elite — Full Analytics & Strategy',
    proScore: 'Pro: Acceptance Score',
    acceptProb: 'Acceptance Probability',
    proSkill: 'Strong skill alignment with requirements',
    proTone: 'Professional tone matches company culture',
    getPro: 'Get Pro — Know Your Chances',
    noAnalytics: 'Analytics Not Available',
    noAnalyticsDesc: 'Upgrade to Pro for acceptance scoring or Elite for full visual analytics and company recommendations.',
    unlock: 'Unlock Insights',
    realCompany: '✓ Real Company Names',
    quantified: '✓ Quantified Results',
    deliverable48: '✓ 48h Deliverable',
    strategic: '✓ Strategic Depth',
    specific: '✓ Specific Examples',
    weeklyDel: '✓ Weekly Deliverable',
    metrics: '✓ Metrics Included',
    basicStructure: 'Basic Structure',
    genericTone: 'Generic Tone',
  },
  tr: {
    badge: 'Canlı Çıktı Önizleme',
    title: 'Farkı Gör:',
    titleHighlight: 'Gerçek Çıktı',
    subtitle: 'Katmanlar arası gerçek teklif kalitesini karşılaştır. Filtresiz, düzenlemesiz.',
    eliteOutput: 'Elite Çıktı',
    proOutput: 'Pro Çıktı',
    freeOutput: 'Ücretsiz Çıktı',
    strengthAnalysis: 'Başvuru Güç Analizi',
    companyRecs: 'Sana Özel Şirket Önerileri',
    getElite: 'Elite Al — Tam Analitik & Strateji',
    proScore: 'Pro: Kabul Skoru',
    acceptProb: 'Kabul Olasılığı',
    proSkill: 'Beceri uyumu güçlü',
    proTone: 'Profesyonel ton şirket kültürüyle uyumlu',
    getPro: 'Pro Al — Şansını Öğren',
    noAnalytics: 'Analitik Mevcut Değil',
    noAnalyticsDesc: 'Kabul skoru için Pro\'ya veya tam görsel analitik ve şirket önerileri için Elite\'e yükseltin.',
    unlock: 'İçgörüleri Aç',
    realCompany: '✓ Gerçek Şirket Adları',
    quantified: '✓ Ölçülebilir Sonuçlar',
    deliverable48: '✓ 48s Teslimat',
    strategic: '✓ Stratejik Derinlik',
    specific: '✓ Spesifik Örnekler',
    weeklyDel: '✓ Haftalık Teslimat',
    metrics: '✓ Metrikler Dahil',
    basicStructure: 'Temel Yapı',
    genericTone: 'Genel Ton',
  },
  de: {
    badge: 'Live-Ausgabe Vorschau',
    title: 'Sehen Sie den Unterschied in',
    titleHighlight: 'Echte Ausgabe',
    subtitle: 'Vergleichen Sie die tatsächliche Angebotsqualität. Ungefiltert.',
    eliteOutput: 'Elite Ausgabe',
    proOutput: 'Pro Ausgabe',
    freeOutput: 'Kostenlose Ausgabe',
    strengthAnalysis: 'Bewerbungsstärke-Analyse',
    companyRecs: 'Unternehmen-Empfehlungen für Sie',
    getElite: 'Elite — Volle Analytik & Strategie',
    proScore: 'Pro: Akzeptanz-Score',
    acceptProb: 'Akzeptanzwahrscheinlichkeit',
    proSkill: 'Starke Kompetenzübereinstimmung',
    proTone: 'Professioneller Ton passt zur Unternehmenskultur',
    getPro: 'Pro — Ihre Chancen kennen',
    noAnalytics: 'Analytik nicht verfügbar',
    noAnalyticsDesc: 'Upgraden Sie auf Pro für Akzeptanz-Scoring oder Elite für vollständige Analytik.',
    unlock: 'Einblicke freischalten',
    realCompany: '✓ Echte Firmennamen',
    quantified: '✓ Quantifizierte Ergebnisse',
    deliverable48: '✓ 48h Lieferung',
    strategic: '✓ Strategische Tiefe',
    specific: '✓ Spezifische Beispiele',
    weeklyDel: '✓ Wöchentliche Lieferung',
    metrics: '✓ Metriken enthalten',
    basicStructure: 'Grundstruktur',
    genericTone: 'Allgemeiner Ton',
  },
  fr: {
    badge: 'Aperçu en direct',
    title: 'Voyez la différence en',
    titleHighlight: 'Sortie réelle',
    subtitle: 'Comparez la qualité réelle des propositions. Sans filtre.',
    eliteOutput: 'Sortie Elite',
    proOutput: 'Sortie Pro',
    freeOutput: 'Sortie gratuite',
    strengthAnalysis: 'Analyse de force de candidature',
    companyRecs: 'Recommandations d\'entreprises pour vous',
    getElite: 'Elite — Analytique & Stratégie complètes',
    proScore: 'Pro: Score d\'acceptation',
    acceptProb: 'Probabilité d\'acceptation',
    proSkill: 'Forte adéquation des compétences',
    proTone: 'Ton professionnel adapté à la culture',
    getPro: 'Pro — Connaître vos chances',
    noAnalytics: 'Analytique non disponible',
    noAnalyticsDesc: 'Passez à Pro pour le scoring ou Elite pour l\'analytique complète.',
    unlock: 'Débloquer les insights',
    realCompany: '✓ Vrais noms d\'entreprises',
    quantified: '✓ Résultats quantifiés',
    deliverable48: '✓ Livraison 48h',
    strategic: '✓ Profondeur stratégique',
    specific: '✓ Exemples spécifiques',
    weeklyDel: '✓ Livraison hebdomadaire',
    metrics: '✓ Métriques incluses',
    basicStructure: 'Structure de base',
    genericTone: 'Ton générique',
  },
};

const FREE_EXAMPLE = `I noticed your team is expanding its frontend capabilities, and I'd love to contribute. With 3 years of React experience, I've built responsive interfaces for SaaS products that improved user engagement.

My recent project involved migrating a legacy jQuery app to React, reducing load times by 40%. I understand the importance of clean, maintainable code and enjoy collaborating with cross-functional teams.

I'd welcome the opportunity to discuss how I can contribute to your goals. When would be a good time for a quick call?`;

const PRO_EXAMPLE = `Your job posting for a Senior Frontend Developer caught my attention — specifically the emphasis on performance optimization and design system architecture. These are areas where I've delivered measurable results.

At my previous role, I led the migration of a 200K+ LOC codebase to a component-based architecture, cutting bundle size by 45% and improving Lighthouse scores from 62 to 94. I also built a design system used by 12 developers across 3 products, reducing UI inconsistencies by 80%.

For your team, I see an immediate opportunity: implementing code-splitting strategies on your main app could yield 30-50% faster initial loads within the first week. I've done this three times before and have a proven playbook.

I'd love to walk through my approach with you. Are you available for a 20-minute call this week?`;

const ELITE_EXAMPLE = `The intersection of real-time collaboration and performance optimization you're tackling is exactly the kind of challenge that energizes me — I've spent the last 4 years solving similar problems at scale.

When Figma's browser-based editor proved that complex applications could match native performance, it changed my approach to frontend architecture. I applied that philosophy at my last role: rebuilding the real-time dashboard that serves 50K daily active users, achieving sub-100ms render times using WebSocket-driven state management with React's concurrent features. That project increased user session duration by 34% and reduced churn by 12%.

Here's what I can deliver in my first 48 hours: a comprehensive performance audit of your current application with a prioritized optimization roadmap, including quick wins (lazy loading, critical CSS extraction) that typically yield 25-40% improvement in Core Web Vitals.

Beyond the technical execution, I bring a strategic perspective on frontend architecture decisions — understanding how technical debt in the UI layer compounds into product velocity problems. At my previous company, my architecture recommendations saved the team an estimated 15 hours/week in development time.

I'd like to share a detailed proposal tailored to your specific tech stack. Could we schedule a 30-minute deep dive this week? I'll come prepared with preliminary findings from analyzing your public-facing application.`;

export const LiveProofSection = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'free' | 'pro' | 'elite'>('elite');
  const s = sectionText[language] || sectionText.en;

  // Localized radar data
  const radarKeys = RADAR_KEYS[language] || RADAR_KEYS.en;
  const RADAR_DATA = BASE_RADAR_DATA.map(d => ({ ...d, metric: radarKeys[d.metric] || d.metric }));

  // Session-stable randomized company selection
  const displayCompanies = useMemo(() => shuffleAndPick(ALL_COMPANIES, 4), []);

  const tabs = [
    { id: 'free' as const, label: 'Free', icon: Sparkles },
    { id: 'pro' as const, label: 'Pro', icon: Target },
    { id: 'elite' as const, label: 'Elite', icon: Crown },
  ];

  const examples = { free: FREE_EXAMPLE, pro: PRO_EXAMPLE, elite: ELITE_EXAMPLE };

  const getLang = (obj: { en: string; tr: string }) => {
    return (obj as any)[language] || obj.en;
  };

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">{s.badge}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {s.title} <span className="text-gradient-gold">{s.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {s.subtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? tab.id === 'elite'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                    : tab.id === 'pro'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Proposal Output */}
          <div className={`rounded-2xl border p-6 ${
            activeTab === 'elite'
              ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card'
              : activeTab === 'pro'
              ? 'border-primary/30 bg-card'
              : 'border-border bg-card'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {activeTab === 'elite' ? (
                  <Crown className="w-5 h-5 text-amber-500" />
                ) : activeTab === 'pro' ? (
                  <Sparkles className="w-5 h-5 text-primary" />
                ) : (
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {activeTab === 'elite' ? s.eliteOutput : activeTab === 'pro' ? s.proOutput : s.freeOutput}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                activeTab === 'elite'
                  ? 'bg-amber-500/20 text-amber-500'
                  : activeTab === 'pro'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {activeTab === 'elite' ? '~450 words' : activeTab === 'pro' ? '~350 words' : '~200 words'}
              </span>
            </div>

            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto pr-2">
              {examples[activeTab]}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {activeTab === 'elite' && (
                  <>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">{s.realCompany}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">{s.quantified}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">{s.deliverable48}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">{s.strategic}</span>
                  </>
                )}
                {activeTab === 'pro' && (
                  <>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{s.specific}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{s.weeklyDel}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{s.metrics}</span>
                  </>
                )}
                {activeTab === 'free' && (
                  <>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{s.basicStructure}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{s.genericTone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="space-y-4">
            {activeTab === 'elite' ? (
              <>
                {/* Radar Chart */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card p-5">
                  <h4 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {s.strengthAnalysis}
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Real Company Recommendations */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-card p-5">
                  <h4 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {s.companyRecs}
                  </h4>
                  <div className="space-y-3">
                    {displayCompanies.map((company, i) => (
                      <div key={i} className="p-3 rounded-xl bg-card border border-border hover:border-amber-500/30 transition-all">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{company.logo}</span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{company.name}</p>
                              <p className="text-xs text-muted-foreground">{company.role}</p>
                            </div>
                          </div>
                          <span className={`text-lg font-bold ${company.pct >= 85 ? 'text-green-500' : 'text-amber-500'}`}>
                            {company.pct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{company.location}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{getLang(company.reason)}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-amber-500">{getLang(company.action)}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <CheckoutButton href={getCheckoutUrl('elite')} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-12">
                  <Crown className="w-5 h-5 mr-2" />
                  {s.getElite}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </CheckoutButton>
              </>
            ) : activeTab === 'pro' ? (
              <>
                <div className="rounded-2xl border border-primary/30 bg-card p-6">
                  <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {s.proScore}
                  </h4>
                  <div className="text-center py-6">
                    <div className="text-6xl font-bold text-primary mb-2">66%</div>
                    <p className="text-sm text-muted-foreground">{s.acceptProb}</p>
                    <div className="w-full h-3 bg-muted rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '66%' }} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{s.proSkill}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{s.proTone}</span>
                    </div>
                  </div>
                </div>
                <CheckoutButton href={getCheckoutUrl('pro')} variant="gold" className="w-full h-12">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {s.getPro}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </CheckoutButton>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{s.noAnalytics}</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  {s.noAnalyticsDesc}
                </p>
                <CheckoutButton href={getCheckoutUrl('pro')} variant="gold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {s.unlock}
                </CheckoutButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};