import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Wand2, BarChart3, Target, MessageCircle, UserSearch, Zap, TrendingUp, Check, ArrowRight } from 'lucide-react';
import { getCheckoutUrl, PLAN_PRICES } from '@/lib/plans';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

const translations = {
  en: {
    badge: 'See What You Get',
    title: 'Pro & Elite — Inside the App',
    subtitle: 'Real features, real screenshots. See exactly what each plan unlocks inside Sovereign.',
    pro: {
      label: 'Pro Plan',
      price: `$${PLAN_PRICES.pro.annual}/yr`,
      tagline: 'Smarter proposals, higher acceptance rates',
      cta: 'Get Pro',
      features: [
        { icon: 'wand', label: 'Auto-Fill Job Description', desc: 'AI reads the listing and fills your fields instantly' },
        { icon: 'bar', label: 'Acceptance Score Breakdown', desc: 'See exactly why your score is high or low' },
        { icon: 'tone', label: 'Tone Optimization', desc: 'Adjust formality, confidence, and persuasion levels' },
        { icon: 'check', label: 'Unlimited Proposals', desc: 'No daily limits — generate as many as you need' },
      ],
    },
    elite: {
      label: 'Elite Plan',
      price: `$${PLAN_PRICES.elite.annual}/yr`,
      tagline: 'Full automation + strategic intelligence',
      cta: 'Go Elite',
      features: [
        { icon: 'zap', label: 'Full Auto-Generate', desc: 'Paste a job link → get a finished proposal automatically' },
        { icon: 'user', label: 'Decision-Maker ID', desc: 'Find who reviews your application at target companies' },
        { icon: 'msg', label: 'Outreach Messages', desc: 'LinkedIn & email messages that get responses' },
        { icon: 'target', label: 'Score Simulation', desc: 'See your current vs optimized potential score' },
      ],
    },
  },
  tr: {
    badge: 'Neler Alacağınızı Görün',
    title: 'Pro & Elite — Uygulama İçinden',
    subtitle: 'Gerçek özellikler, gerçek ekran görüntüleri. Her planın Sovereign içinde neleri açtığını görün.',
    pro: {
      label: 'Pro Plan',
      price: `$${PLAN_PRICES.pro.annual}/yıl`,
      tagline: 'Daha akıllı teklifler, daha yüksek kabul oranları',
      cta: 'Pro\'yu Al',
      features: [
        { icon: 'wand', label: 'İş Tanımını Otomatik Doldur', desc: 'Yapay zeka ilanı okur ve alanlarınızı anında doldurur' },
        { icon: 'bar', label: 'Kabul Skoru Detayları', desc: 'Skorunuzun neden yüksek veya düşük olduğunu görün' },
        { icon: 'tone', label: 'Ton Optimizasyonu', desc: 'Resmiyet, güven ve ikna seviyelerini ayarlayın' },
        { icon: 'check', label: 'Sınırsız Teklif', desc: 'Günlük limit yok — istediğiniz kadar oluşturun' },
      ],
    },
    elite: {
      label: 'Elite Plan',
      price: `$${PLAN_PRICES.elite.annual}/yıl`,
      tagline: 'Tam otomasyon + stratejik zeka',
      cta: 'Elite\'e Geç',
      features: [
        { icon: 'zap', label: 'Tam Otomatik Oluşturma', desc: 'İş bağlantısı yapıştır → hazır teklif otomatik gelir' },
        { icon: 'user', label: 'Karar Verici Kimliği', desc: 'Hedef şirketlerde başvurunuzu kimin incelediğini bulun' },
        { icon: 'msg', label: 'Erişim Mesajları', desc: 'Yanıt alan LinkedIn ve e-posta mesajları' },
        { icon: 'target', label: 'Skor Simülasyonu', desc: 'Mevcut vs optimize edilmiş potansiyel skorunuzu görün' },
      ],
    },
  },
  de: {
    badge: 'Sehen Sie, was Sie bekommen',
    title: 'Pro & Elite — In der App',
    subtitle: 'Echte Funktionen, echte Screenshots. Sehen Sie genau, was jeder Plan in Sovereign freischaltet.',
    pro: {
      label: 'Pro Plan',
      price: `$${PLAN_PRICES.pro.annual}/Jahr`,
      tagline: 'Klügere Angebote, höhere Akzeptanzraten',
      cta: 'Pro holen',
      features: [
        { icon: 'wand', label: 'Auto-Fill Stellenbeschreibung', desc: 'KI liest die Anzeige und füllt Ihre Felder sofort' },
        { icon: 'bar', label: 'Akzeptanz-Score Aufschlüsselung', desc: 'Sehen Sie genau, warum Ihr Score hoch oder niedrig ist' },
        { icon: 'tone', label: 'Ton-Optimierung', desc: 'Formalität, Vertrauen und Überzeugungskraft anpassen' },
        { icon: 'check', label: 'Unbegrenzte Angebote', desc: 'Keine Tageslimits — so viele wie nötig erstellen' },
      ],
    },
    elite: {
      label: 'Elite Plan',
      price: `$${PLAN_PRICES.elite.annual}/Jahr`,
      tagline: 'Volle Automatisierung + strategische Intelligenz',
      cta: 'Elite werden',
      features: [
        { icon: 'zap', label: 'Voll-Autogenerierung', desc: 'Job-Link einfügen → fertiges Angebot automatisch' },
        { icon: 'user', label: 'Entscheidungsträger-ID', desc: 'Finden Sie, wer Ihre Bewerbung prüft' },
        { icon: 'msg', label: 'Outreach-Nachrichten', desc: 'LinkedIn- & E-Mail-Nachrichten mit Antwortrate' },
        { icon: 'target', label: 'Score-Simulation', desc: 'Aktueller vs. optimierter potenzieller Score' },
      ],
    },
  },
  fr: {
    badge: 'Voyez ce que vous obtenez',
    title: 'Pro & Elite — Dans l\'Application',
    subtitle: 'Vraies fonctionnalités, vrais captures d\'écran. Voyez exactement ce que chaque plan débloque.',
    pro: {
      label: 'Plan Pro',
      price: `$${PLAN_PRICES.pro.annual}/an`,
      tagline: 'Des propositions plus intelligentes, des taux d\'acceptation plus élevés',
      cta: 'Obtenir Pro',
      features: [
        { icon: 'wand', label: 'Auto-remplissage de description', desc: 'L\'IA lit l\'annonce et remplit vos champs instantanément' },
        { icon: 'bar', label: 'Détails du score d\'acceptation', desc: 'Voyez exactement pourquoi votre score est haut ou bas' },
        { icon: 'tone', label: 'Optimisation du ton', desc: 'Ajustez la formalité, la confiance et la persuasion' },
        { icon: 'check', label: 'Propositions illimitées', desc: 'Pas de limites quotidiennes — générez autant que nécessaire' },
      ],
    },
    elite: {
      label: 'Plan Elite',
      price: `$${PLAN_PRICES.elite.annual}/an`,
      tagline: 'Automatisation complète + intelligence stratégique',
      cta: 'Passer à Elite',
      features: [
        { icon: 'zap', label: 'Génération automatique complète', desc: 'Collez un lien → proposition finie automatiquement' },
        { icon: 'user', label: 'Identification du décideur', desc: 'Trouvez qui examine votre candidature' },
        { icon: 'msg', label: 'Messages de prospection', desc: 'Messages LinkedIn et e-mail qui obtiennent des réponses' },
        { icon: 'target', label: 'Simulation de score', desc: 'Score actuel vs potentiel optimisé' },
      ],
    },
  },
};

const iconMap: Record<string, React.ElementType> = {
  wand: Wand2,
  bar: BarChart3,
  tone: TrendingUp,
  check: Check,
  zap: Zap,
  user: UserSearch,
  msg: MessageCircle,
  target: Target,
};

// Fake app mockup components
const ProMockup = () => (
  <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs">
    {/* Header bar */}
    <div className="flex items-center justify-between pb-2 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
        <span className="font-semibold text-foreground text-[11px]">Sovereign Pro</span>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Pro</span>
    </div>
    {/* Auto-fill mockup */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Wand2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">Auto-Fill Active</span>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Segment</span>
          <span className="text-foreground font-medium">Web Development</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform</span>
          <span className="text-foreground font-medium">Upwork</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tone</span>
          <span className="text-foreground font-medium">Professional</span>
        </div>
      </div>
    </div>
    {/* Score breakdown mockup */}
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Score Breakdown
        </span>
        <span className="text-lg font-bold text-green-500">78%</span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: 'Keyword Match', value: 85 },
          { label: 'Hook Strength', value: 72 },
          { label: 'Specificity', value: 80 },
          { label: 'Tone Fit', value: 74 },
        ].map(f => (
          <div key={f.label}>
            <div className="flex justify-between mb-0.5">
              <span className="text-muted-foreground text-[10px]">{f.label}</span>
              <span className="text-foreground text-[10px] font-medium">{f.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EliteMockup = () => (
  <div className="rounded-xl border border-amber-500/30 bg-background p-4 space-y-3 text-xs">
    {/* Header bar */}
    <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </div>
        <span className="font-semibold text-foreground text-[11px]">Sovereign Elite</span>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Elite</span>
    </div>
    {/* Score simulation */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-muted-foreground">Score Simulation</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 text-center p-2 rounded-lg bg-muted/50">
          <div className="text-[10px] text-muted-foreground mb-1">Current</div>
          <div className="text-xl font-bold text-amber-500">64%</div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-[10px] text-green-500 mb-1">Optimized</div>
          <div className="text-xl font-bold text-green-500">89%</div>
        </div>
      </div>
    </div>
    {/* Decision maker mockup */}
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <UserSearch className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-muted-foreground">Decision-Maker Identified</span>
      </div>
      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-[10px]">JD</div>
          <div>
            <div className="text-foreground font-medium text-[11px]">John Doe</div>
            <div className="text-muted-foreground text-[10px]">Hiring Manager · Acme Inc</div>
          </div>
        </div>
      </div>
    </div>
    {/* Outreach message */}
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-muted-foreground">Outreach Ready</span>
      </div>
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-2.5 text-[10px] text-muted-foreground leading-relaxed italic">
        "Hi John, I noticed your team is scaling the frontend — I recently led a similar migration at..."
      </div>
    </div>
  </div>
);

export const PlanShowcaseSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const plans = [
    {
      ...t.pro,
      isPro: true,
      mockup: <ProMockup />,
      link: getCheckoutUrl('pro'),
      gradient: 'from-primary/10 to-primary/5',
      borderColor: 'border-primary/30',
      accentColor: 'text-primary',
      badgeBg: 'bg-primary/10',
    },
    {
      ...t.elite,
      isPro: false,
      mockup: <EliteMockup />,
      link: getCheckoutUrl('elite'),
      gradient: 'from-amber-500/10 to-orange-500/5',
      borderColor: 'border-amber-500/30',
      accentColor: 'text-amber-500',
      badgeBg: 'bg-amber-500/10',
    },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-foreground mb-4"
          >
            {t.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className={`rounded-2xl border ${plan.borderColor} bg-gradient-to-b ${plan.gradient} p-8 flex flex-col`}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {plan.isPro ? (
                    <Sparkles className={`w-5 h-5 ${plan.accentColor}`} />
                  ) : (
                    <Crown className={`w-5 h-5 ${plan.accentColor}`} />
                  )}
                  <h3 className="text-xl font-bold text-foreground">{plan.label}</h3>
                </div>
                <span className={`text-sm font-semibold ${plan.accentColor} ${plan.badgeBg} px-3 py-1 rounded-full`}>
                  {plan.price}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{plan.tagline}</p>

              {/* App mockup */}
              <div className="mb-6">
                {plan.mockup}
              </div>

              {/* Feature list */}
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feat, i) => {
                  const Icon = iconMap[feat.icon] || Check;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${plan.badgeBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${plan.accentColor}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{feat.label}</div>
                        <div className="text-xs text-muted-foreground">{feat.desc}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <CheckoutButton
                href={plan.link}
                variant={plan.isPro ? 'gold' : 'outline'}
                size="lg"
                className={`w-full ${!plan.isPro ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0' : ''}`}
              >
                {plan.cta} — {plan.price}
                <ArrowRight className="w-4 h-4 ml-2" />
              </CheckoutButton>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
