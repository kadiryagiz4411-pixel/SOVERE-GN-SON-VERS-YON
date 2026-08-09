import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Lock, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { getCheckoutUrl } from '@/lib/plans';
import { trackEvent } from '@/lib/analytics';
import { useLanguage } from '@/i18n/LanguageContext';

const translations = {
  en: {
    badge: 'Try It Now — No Login Required',
    title: 'See Your Proposal Score Instantly',
    subtitle: 'Select your role and platform to preview an AI-optimized proposal with a real acceptance score.',
    rolePlaceholder: 'Select your role...',
    platformPlaceholder: 'Select platform...',
    generate: 'Generate Preview',
    analyzing: 'Analyzing...',
    acceptanceLabel: 'Acceptance Probability',
    unlockLabel: 'Full proposal + optimization insights',
    unlockCta: 'Unlock Full Proposal — Sign Up Free',
    noCard: 'No credit card required',
    emptyState: 'Select a role and platform, then click "Generate Preview" to see your score',
    roles: [
      { id: 'web-developer', label: 'Web Developer' },
      { id: 'graphic-designer', label: 'Graphic Designer' },
      { id: 'copywriter', label: 'Copywriter' },
      { id: 'data-analyst', label: 'Data Analyst' },
      { id: 'product-manager', label: 'Product Manager' },
      { id: 'seo-specialist', label: 'SEO Specialist' },
    ],
    platforms: [
      { id: 'upwork', label: 'Upwork' },
      { id: 'fiverr', label: 'Fiverr' },
      { id: 'corporate', label: 'Corporate Job' },
      { id: 'direct-client', label: 'Direct Client' },
    ],
  },
  tr: {
    badge: 'Hemen Deneyin — Giriş Gerekmiyor',
    title: 'Teklif Skorunuzu Anında Görün',
    subtitle: 'Gerçek kabul skoru ile yapay zeka optimizeli bir teklif önizlemesi için rolünüzü ve platformunuzu seçin.',
    rolePlaceholder: 'Rolünüzü seçin...',
    platformPlaceholder: 'Platform seçin...',
    generate: 'Önizleme Oluştur',
    analyzing: 'Analiz ediliyor...',
    acceptanceLabel: 'Kabul Olasılığı',
    unlockLabel: 'Tam teklif + optimizasyon önerileri',
    unlockCta: 'Tam Teklifi Aç — Ücretsiz Kayıt Ol',
    noCard: 'Kredi kartı gerekmez',
    emptyState: 'Bir rol ve platform seçin, ardından skorunuzu görmek için "Önizleme Oluştur"a tıklayın',
    roles: [
      { id: 'web-developer', label: 'Web Geliştirici' },
      { id: 'graphic-designer', label: 'Grafik Tasarımcı' },
      { id: 'copywriter', label: 'İçerik Yazarı' },
      { id: 'data-analyst', label: 'Veri Analisti' },
      { id: 'product-manager', label: 'Ürün Yöneticisi' },
      { id: 'seo-specialist', label: 'SEO Uzmanı' },
    ],
    platforms: [
      { id: 'upwork', label: 'Upwork' },
      { id: 'fiverr', label: 'Fiverr' },
      { id: 'corporate', label: 'Kurumsal İş' },
      { id: 'direct-client', label: 'Doğrudan Müşteri' },
    ],
  },
  de: {
    badge: 'Jetzt ausprobieren — Keine Anmeldung nötig',
    title: 'Sehen Sie Ihren Angebots-Score sofort',
    subtitle: 'Wählen Sie Ihre Rolle und Plattform, um eine KI-optimierte Angebotsvorschau mit echtem Akzeptanz-Score zu sehen.',
    rolePlaceholder: 'Rolle auswählen...',
    platformPlaceholder: 'Plattform auswählen...',
    generate: 'Vorschau erstellen',
    analyzing: 'Analysiere...',
    acceptanceLabel: 'Akzeptanzwahrscheinlichkeit',
    unlockLabel: 'Vollständiges Angebot + Optimierungseinblicke',
    unlockCta: 'Vollständiges Angebot freischalten — Kostenlos registrieren',
    noCard: 'Keine Kreditkarte erforderlich',
    emptyState: 'Wählen Sie eine Rolle und Plattform, dann klicken Sie auf "Vorschau erstellen"',
    roles: [
      { id: 'web-developer', label: 'Web-Entwickler' },
      { id: 'graphic-designer', label: 'Grafikdesigner' },
      { id: 'copywriter', label: 'Texter' },
      { id: 'data-analyst', label: 'Datenanalyst' },
      { id: 'product-manager', label: 'Produktmanager' },
      { id: 'seo-specialist', label: 'SEO-Spezialist' },
    ],
    platforms: [
      { id: 'upwork', label: 'Upwork' },
      { id: 'fiverr', label: 'Fiverr' },
      { id: 'corporate', label: 'Unternehmensanstellung' },
      { id: 'direct-client', label: 'Direktkunde' },
    ],
  },
  fr: {
    badge: 'Essayez maintenant — Sans inscription',
    title: 'Voyez votre score de proposition instantanément',
    subtitle: 'Sélectionnez votre rôle et plateforme pour prévisualiser une proposition optimisée par IA avec un vrai score d\'acceptation.',
    rolePlaceholder: 'Sélectionnez votre rôle...',
    platformPlaceholder: 'Sélectionnez la plateforme...',
    generate: 'Générer l\'aperçu',
    analyzing: 'Analyse en cours...',
    acceptanceLabel: 'Probabilité d\'acceptation',
    unlockLabel: 'Proposition complète + insights d\'optimisation',
    unlockCta: 'Débloquer la proposition complète — Inscription gratuite',
    noCard: 'Aucune carte de crédit requise',
    emptyState: 'Sélectionnez un rôle et une plateforme, puis cliquez sur "Générer l\'aperçu"',
    roles: [
      { id: 'web-developer', label: 'Développeur Web' },
      { id: 'graphic-designer', label: 'Graphiste' },
      { id: 'copywriter', label: 'Rédacteur' },
      { id: 'data-analyst', label: 'Analyste de données' },
      { id: 'product-manager', label: 'Chef de produit' },
      { id: 'seo-specialist', label: 'Spécialiste SEO' },
    ],
    platforms: [
      { id: 'upwork', label: 'Upwork' },
      { id: 'fiverr', label: 'Fiverr' },
      { id: 'corporate', label: 'Emploi en entreprise' },
      { id: 'direct-client', label: 'Client direct' },
    ],
  },
};

// Pre-generated demo outputs (deterministic, no API call needed)
const DEMO_OUTPUTS: Record<string, { preview: string; score: number; competition: string; percentile: string }> = {
  'web-developer-upwork': {
    preview: `Your React and Node.js project caught my attention because of the migration challenge from a legacy jQuery codebase — I handled an identical transition for a fintech platform last quarter, reducing load times by 62% while maintaining full backward compatibility.\n\nMy approach would start with a component-level audit of your existing frontend, mapping dependency chains before writing a single line of new code. I've built 14 production React applications with TypeScript, and my process ensures zero downtime during migration.`,
    score: 64,
    competition: 'High',
    percentile: 'Top 40%',
  },
  'graphic-designer-upwork': {
    preview: `The clean, geometric direction you described for your SaaS rebrand resonates with the visual language I've developed across 40+ brand identity projects. Your emphasis on "trustworthy but modern" tells me you need a system that balances warmth with precision.\n\nI'd start with a focused mood board exploring three directions — one minimal-geometric, one typographic-forward, and one icon-driven — so you can feel the brand before we commit to production.`,
    score: 58,
    competition: 'Moderate',
    percentile: 'Top 40%',
  },
  'copywriter-upwork': {
    preview: `Your product page conversion challenge is one I've solved repeatedly — most recently for a DTC supplement brand where I rewrote their hero copy and saw a 34% lift in add-to-cart rate within the first two weeks.\n\nThe key isn't just better words. It's restructuring the page narrative: leading with the transformation your customer wants, then layering in proof. I'd audit your current flow, identify the three biggest friction points, and deliver headline variations plus a full rewrite.`,
    score: 61,
    competition: 'High',
    percentile: 'Top 40%',
  },
  'data-analyst-corporate': {
    preview: `Your need for someone who can bridge raw data and executive decision-making is exactly where I operate. At my previous role, I built the analytics infrastructure that reduced reporting cycles from 5 days to 4 hours while introducing predictive models that improved inventory forecasting accuracy by 28%.\n\nI'm particularly drawn to the cross-functional aspect of this role — translating complex statistical findings into actionable recommendations is the part of data work I find most rewarding.`,
    score: 67,
    competition: 'Moderate',
    percentile: 'Top 40%',
  },
};

function getDemoKey(role: string, platform: string): string {
  const key = `${role}-${platform}`;
  if (DEMO_OUTPUTS[key]) return key;
  if (DEMO_OUTPUTS[`${role}-upwork`]) return `${role}-upwork`;
  return Object.keys(DEMO_OUTPUTS)[0];
}

const competitionLabels: Record<string, Record<string, string>> = {
  High: { en: 'High Competitive Pressure', tr: 'Yüksek Rekabet Baskısı', de: 'Hoher Wettbewerbsdruck', fr: 'Forte pression concurrentielle' },
  Moderate: { en: 'Moderate Competition', tr: 'Orta Rekabet', de: 'Moderater Wettbewerb', fr: 'Concurrence modérée' },
};

const blurredText: Record<string, string> = {
  en: 'I\'d propose starting with a discovery call this week to align on priorities and timeline. Based on what you\'ve described, I can deliver a detailed project plan within 48 hours of our conversation, including milestone breakdowns and a risk mitigation strategy tailored to your specific constraints.\n\nMy availability is flexible for the next two weeks, and I\'m prepared to begin immediately upon agreement. Looking forward to discussing how we can make this project a success.',
  tr: 'Bu hafta öncelikleri ve zaman çizelgesini belirlemek için bir keşif görüşmesi ile başlamayı öneriyorum. Anlattıklarınıza dayanarak, görüşmemizden sonraki 48 saat içinde kilometre taşı dökümleri ve özel kısıtlamalarınıza göre uyarlanmış risk azaltma stratejisi dahil detaylı bir proje planı sunabilirim.',
  de: 'Ich schlage vor, diese Woche mit einem Entdeckungsgespräch zu beginnen, um Prioritäten und Zeitplan abzustimmen. Basierend auf Ihrer Beschreibung kann ich innerhalb von 48 Stunden einen detaillierten Projektplan liefern, einschließlich Meilenstein-Aufschlüsselungen und einer Risikominderungsstrategie.',
  fr: 'Je propose de commencer par un appel de découverte cette semaine pour aligner les priorités et le calendrier. Sur la base de ce que vous avez décrit, je peux fournir un plan de projet détaillé dans les 48 heures, incluant des jalons et une stratégie de mitigation des risques.',
};

export const LiveDemoSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [demoResult, setDemoResult] = useState<typeof DEMO_OUTPUTS[string] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!selectedRole || !selectedPlatform) return;
    trackEvent('cta_click', { label: 'demo_generate', source: 'landing_demo' });
    setIsGenerating(true);
    setTimeout(() => {
      const key = getDemoKey(selectedRole, selectedPlatform);
      setDemoResult(DEMO_OUTPUTS[key]);
      setIsGenerating(false);
    }, 1500);
  };

  const scoreColor = (s: number) => s >= 70 ? 'text-green-500' : s >= 55 ? 'text-amber-500' : 'text-red-500';

  return (
    <section className="py-20 bg-gradient-to-b from-card to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Input Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="flex-1 h-12 bg-card border-border">
                <SelectValue placeholder={t.rolePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {t.roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="flex-1 h-12 bg-card border-border">
                <SelectValue placeholder={t.platformPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {t.platforms.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="gold"
              size="lg"
              className="h-12 px-8"
              onClick={handleGenerate}
              disabled={!selectedRole || !selectedPlatform || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                t.generate
              )}
            </Button>
          </div>

          {/* Result */}
          {demoResult && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in">
              {/* Score Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm">{t.acceptanceLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {competitionLabels[demoResult.competition]?.[language] || competitionLabels[demoResult.competition]?.en || demoResult.competition}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{demoResult.percentile}</Badge>
                  <span className={`text-2xl font-bold ${scoreColor(demoResult.score)}`}>{demoResult.score}%</span>
                </div>
              </div>

              {/* Proposal Preview */}
              <div className="p-6 relative">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                  {demoResult.preview}
                </div>

                {/* Blur overlay */}
                <div className="mt-4 relative">
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm blur-sm select-none pointer-events-none" aria-hidden="true">
                    {blurredText[language] || blurredText.en}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card" />
                </div>

                {/* CTA overlay */}
                <div className="flex flex-col items-center pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">{t.unlockLabel}</span>
                  </div>
                  <CheckoutButton
                    href={getCheckoutUrl('pro')}
                    variant="hero"
                    size="lg"
                    className="group px-8 py-6 h-auto"
                    onClick={() => trackEvent('cta_click', { label: 'demo_signup', source: 'landing_demo' })}
                  >
                    {t.unlockCta}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </CheckoutButton>
                  <p className="text-xs text-muted-foreground mt-3">{t.noCard}</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!demoResult && !isGenerating && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card/50">
              <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t.emptyState}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
