import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, Star, TrendingUp, Search, Zap } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';

const translations = {
  en: {
    badge: 'Freelancer? We Built This For You',
    title: 'Win More Jobs on Upwork, Fiverr & Freelancer',
    subtitle: 'AI-crafted proposals tailored to each platform\'s algorithm and buyer psychology. Find jobs faster, apply smarter.',
    cta: 'Start Winning Proposals Free',
    jobDiscoveryTitle: 'Smart Job Discovery',
    jobDiscoveryItems: [
      { icon: Search, text: 'AI finds jobs matching your skills across platforms' },
      { icon: Zap, text: 'One-click proposal generation for any listing' },
      { icon: TrendingUp, text: 'Acceptance score prediction before you apply' },
    ],
    platforms: [
      {
        name: 'Upwork',
        icon: '💼',
        stats: '87% of top freelancers use structured proposals',
        features: ['Cover letter optimization', 'Client pain-point targeting', 'Bid strategy alignment'],
        link: '/upwork-proposal/web-developer',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      },
      {
        name: 'Fiverr',
        icon: '🎯',
        stats: 'Buyers decide in 8 seconds — make every word count',
        features: ['Gig response optimization', 'Value-first positioning', 'Instant buyer trust signals'],
        link: '/fiverr-proposal/graphic-designer',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      },
      {
        name: 'Freelancer',
        icon: '🚀',
        stats: 'Stand out among thousands of competing bids',
        features: ['Contest-winning proposals', 'Competitive bid analysis', 'Portfolio-linked pitches'],
        link: '/best-proposal/web-developer',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20',
      },
      {
        name: 'Direct Clients',
        icon: '🤝',
        stats: 'Cold outreach that converts at 3x industry average',
        features: ['Persuasive cold pitches', 'ROI-focused messaging', 'Portfolio integration'],
        link: '/best-proposal/copywriter',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      },
    ],
    proofStats: [
      { value: '3x', label: 'Higher response rate' },
      { value: '67%', label: 'Avg acceptance score' },
      { value: '50+', label: 'Languages supported' },
      { value: '10K+', label: 'Proposals generated' },
    ],
  },
  tr: {
    badge: 'Freelancer mısın? Tam Sana Göre',
    title: 'Upwork, Fiverr ve Freelancer\'da Daha Fazla İş Kazan',
    subtitle: 'Her platformun algoritmasına ve alıcı psikolojisine göre özelleştirilmiş AI teklifleri. Daha hızlı iş bul, daha akıllı başvur.',
    cta: 'Ücretsiz Kazanan Teklifler Oluştur',
    jobDiscoveryTitle: 'Akıllı İş Keşfi',
    jobDiscoveryItems: [
      { icon: Search, text: 'AI yeteneklerinize uygun işleri platformlarda bulur' },
      { icon: Zap, text: 'Herhangi bir ilan için tek tıkla teklif oluşturma' },
      { icon: TrendingUp, text: 'Başvurmadan önce kabul skoru tahmini' },
    ],
    platforms: [
      {
        name: 'Upwork',
        icon: '💼',
        stats: 'En iyi freelancerların %87\'si yapılandırılmış teklifler kullanıyor',
        features: ['Kapak mektubu optimizasyonu', 'Müşteri sorun noktası hedefleme', 'Teklif stratejisi uyumu'],
        link: '/upwork-proposal/web-developer',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      },
      {
        name: 'Fiverr',
        icon: '🎯',
        stats: 'Alıcılar 8 saniyede karar veriyor — her kelimeyi önemli kıl',
        features: ['Gig yanıt optimizasyonu', 'Değer odaklı konumlandırma', 'Anlık güven sinyalleri'],
        link: '/fiverr-proposal/graphic-designer',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      },
      {
        name: 'Freelancer',
        icon: '🚀',
        stats: 'Binlerce rakip teklifin arasından sıyrıl',
        features: ['Yarışma kazanan teklifler', 'Rekabetçi teklif analizi', 'Portföy bağlantılı sunumlar'],
        link: '/best-proposal/web-developer',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20',
      },
      {
        name: 'Doğrudan Müşteri',
        icon: '🤝',
        stats: 'Sektör ortalamasının 3 katı dönüşüm oranı',
        features: ['İkna edici soğuk teklifler', 'ROI odaklı mesajlar', 'Portföy entegrasyonu'],
        link: '/best-proposal/copywriter',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      },
    ],
    proofStats: [
      { value: '3x', label: 'Daha yüksek yanıt oranı' },
      { value: '67%', label: 'Ort. kabul skoru' },
      { value: '50+', label: 'Dil desteği' },
      { value: '10K+', label: 'Oluşturulan teklif' },
    ],
  },
  de: {
    badge: 'Freelancer? Genau für dich gebaut',
    title: 'Gewinne mehr Jobs auf Upwork, Fiverr & Freelancer',
    subtitle: 'KI-optimierte Angebote, angepasst an den Algorithmus und die Käuferpsychologie jeder Plattform. Schneller finden, smarter bewerben.',
    cta: 'Kostenlos Gewinner-Angebote erstellen',
    jobDiscoveryTitle: 'Smarte Job-Suche',
    jobDiscoveryItems: [
      { icon: Search, text: 'KI findet plattformübergreifend passende Jobs' },
      { icon: Zap, text: 'Ein-Klick-Angebotserstellung für jedes Inserat' },
      { icon: TrendingUp, text: 'Akzeptanzvorhersage vor der Bewerbung' },
    ],
    platforms: [
      {
        name: 'Upwork',
        icon: '💼',
        stats: '87% der Top-Freelancer nutzen strukturierte Angebote',
        features: ['Anschreiben-Optimierung', 'Kundenproblem-Targeting', 'Gebotsstrategie'],
        link: '/upwork-proposal/web-developer',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      },
      {
        name: 'Fiverr',
        icon: '🎯',
        stats: 'Käufer entscheiden in 8 Sekunden',
        features: ['Gig-Antwort-Optimierung', 'Wertorientierte Positionierung', 'Sofortige Vertrauenssignale'],
        link: '/fiverr-proposal/graphic-designer',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      },
      {
        name: 'Freelancer',
        icon: '🚀',
        stats: 'Hebe dich unter Tausenden Mitbewerbern ab',
        features: ['Wettbewerb-gewinnende Angebote', 'Wettbewerbsanalyse', 'Portfolio-verlinkte Pitches'],
        link: '/best-proposal/web-developer',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20',
      },
      {
        name: 'Direktkunden',
        icon: '🤝',
        stats: '3x höhere Konversionsrate als der Branchendurchschnitt',
        features: ['Überzeugende Kaltakquise', 'ROI-fokussierte Nachrichten', 'Portfolio-Integration'],
        link: '/best-proposal/copywriter',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      },
    ],
    proofStats: [
      { value: '3x', label: 'Höhere Antwortrate' },
      { value: '67%', label: 'Durchschn. Akzeptanz' },
      { value: '50+', label: 'Sprachen unterstützt' },
      { value: '10K+', label: 'Angebote erstellt' },
    ],
  },
  fr: {
    badge: 'Freelance ? Conçu pour vous',
    title: 'Gagnez plus de missions sur Upwork, Fiverr & Freelancer',
    subtitle: 'Propositions optimisées par IA, adaptées à l\'algorithme et la psychologie d\'achat de chaque plateforme. Trouvez plus vite, postulez mieux.',
    cta: 'Créer des propositions gagnantes',
    jobDiscoveryTitle: 'Recherche d\'emploi intelligente',
    jobDiscoveryItems: [
      { icon: Search, text: 'L\'IA trouve des jobs adaptés à vos compétences' },
      { icon: Zap, text: 'Génération de proposition en un clic' },
      { icon: TrendingUp, text: 'Prédiction du score d\'acceptation avant de postuler' },
    ],
    platforms: [
      {
        name: 'Upwork',
        icon: '💼',
        stats: '87% des top freelancers utilisent des propositions structurées',
        features: ['Optimisation de la lettre', 'Ciblage des besoins client', 'Stratégie d\'enchères'],
        link: '/upwork-proposal/web-developer',
        color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      },
      {
        name: 'Fiverr',
        icon: '🎯',
        stats: 'Les acheteurs décident en 8 secondes',
        features: ['Optimisation des réponses', 'Positionnement valeur', 'Signaux de confiance'],
        link: '/fiverr-proposal/graphic-designer',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      },
      {
        name: 'Freelancer',
        icon: '🚀',
        stats: 'Démarquez-vous parmi des milliers de concurrents',
        features: ['Propositions gagnantes', 'Analyse concurrentielle', 'Pitchs liés au portfolio'],
        link: '/best-proposal/web-developer',
        color: 'from-sky-500/10 to-blue-500/10 border-sky-500/20',
      },
      {
        name: 'Clients Directs',
        icon: '🤝',
        stats: 'Taux de conversion 3x supérieur à la moyenne',
        features: ['Pitchs de prospection', 'Messages axés ROI', 'Intégration portfolio'],
        link: '/best-proposal/copywriter',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
      },
    ],
    proofStats: [
      { value: '3x', label: 'Taux de réponse plus élevé' },
      { value: '67%', label: 'Score d\'acceptation moy.' },
      { value: '50+', label: 'Langues supportées' },
      { value: '10K+', label: 'Propositions générées' },
    ],
  },
};

export const FreelancePlatformSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background to-card relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Briefcase className="w-4 h-4 text-primary" />
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

        {/* Job Discovery Feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-14 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8"
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            {t.jobDiscoveryTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {t.jobDiscoveryItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-14">
          {t.platforms.map((platform, i) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={platform.link} className="block group">
                <div className={`rounded-2xl border bg-gradient-to-br ${platform.color} p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}>
                  <div className="text-3xl mb-3">{platform.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {platform.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{platform.stats}</p>
                  <ul className="space-y-2">
                    {platform.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                        <Star className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Proof Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10"
        >
          {t.proofStats.map((stat, i) => (
            <div key={i} className="text-center p-4">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link to="/dashboard">
            <Button variant="hero" size="lg" className="group text-base px-10 py-7 h-auto">
              {t.cta}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
