import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { getCheckoutUrl } from '@/lib/plans';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import { motion } from 'framer-motion';

const translations = {
  en: {
    title: 'Generic vs. AI-Optimized',
    subtitle: 'See the difference structured optimization makes on acceptance probability.',
    genericLabel: 'Generic Proposal',
    optimizedLabel: 'Sovereign Proposal',
    optimizedBadge: 'AI-Optimized',
    scoreLabel: 'Acceptance Score',
    cta: 'Try It Free Now',
    genericText: [
      'Dear Hiring Manager,',
      'I am writing to express my interest in the position at your company. I have experience in web development and I believe I would be a great fit for this role.',
      'I am a hard worker and a team player. I am passionate about technology and always eager to learn new things.',
      'Please find my resume attached. I look forward to hearing from you.',
    ],
    optimizedText: [
      'Your migration from a monolithic PHP backend to microservices is exactly the challenge I solved for a Series B fintech last quarter — reducing deployment cycles from 2 weeks to 4 hours.',
      'I\'d start with a dependency audit of your current architecture, then implement a strangler fig pattern to migrate incrementally without disrupting your 50K daily active users.',
      'I can share a detailed migration roadmap within 48 hours of our first call.',
    ],
  },
  tr: {
    title: 'Genel vs. Yapay Zeka ile Optimize Edilmiş',
    subtitle: 'Yapılandırılmış optimizasyonun kabul olasılığı üzerindeki farkını görün.',
    genericLabel: 'Genel Teklif',
    optimizedLabel: 'Sovereign Teklifi',
    optimizedBadge: 'Yapay Zeka ile Optimize',
    scoreLabel: 'Kabul Skoru',
    cta: 'Şimdi Ücretsiz Dene',
    genericText: [
      'Sayın İşe Alım Müdürü,',
      'Şirketinizdeki pozisyona olan ilgimi ifade etmek için yazıyorum. Web geliştirme konusunda deneyimim var ve bu rol için uygun olduğuma inanıyorum.',
      'Çalışkan biriyim ve takım oyuncusuyum. Teknolojiye tutkuyla bağlıyım ve sürekli yeni şeyler öğrenmeye hevesliyim.',
      'Özgeçmişimi ekte bulabilirsiniz. Sizden haber bekliyorum.',
    ],
    optimizedText: [
      'Monolitik PHP backend\'den mikroservislere geçiş projeniz, geçen çeyrekte bir Series B fintech şirketi için çözdüğüm zorluğun tam karşılığı — dağıtım döngülerini 2 haftadan 4 saate indirdim.',
      'Mevcut mimarinizin bağımlılık denetimi ile başlayıp, 50K günlük aktif kullanıcınızı aksatmadan kademeli geçiş için strangler fig pattern uygulardım.',
      'İlk görüşmemizden sonraki 48 saat içinde detaylı bir geçiş yol haritası paylaşabilirim.',
    ],
  },
  de: {
    title: 'Generisch vs. KI-Optimiert',
    subtitle: 'Sehen Sie den Unterschied, den strukturierte Optimierung auf die Akzeptanzwahrscheinlichkeit macht.',
    genericLabel: 'Generisches Angebot',
    optimizedLabel: 'Sovereign Angebot',
    optimizedBadge: 'KI-Optimiert',
    scoreLabel: 'Akzeptanz-Score',
    cta: 'Jetzt kostenlos testen',
    genericText: [
      'Sehr geehrter Personalverantwortlicher,',
      'Ich schreibe, um mein Interesse an der Stelle in Ihrem Unternehmen auszudrücken. Ich habe Erfahrung in der Webentwicklung und glaube, gut für diese Rolle geeignet zu sein.',
      'Ich bin fleißig und ein Teamplayer. Ich bin leidenschaftlich an Technologie interessiert und lerne gerne Neues.',
      'Meinen Lebenslauf finden Sie im Anhang. Ich freue mich auf Ihre Rückmeldung.',
    ],
    optimizedText: [
      'Ihre Migration von einem monolithischen PHP-Backend zu Microservices ist genau die Herausforderung, die ich letztes Quartal für ein Series-B-Fintech gelöst habe — Deployment-Zyklen von 2 Wochen auf 4 Stunden reduziert.',
      'Ich würde mit einem Abhängigkeits-Audit Ihrer aktuellen Architektur beginnen und dann ein Strangler-Fig-Pattern implementieren, um schrittweise zu migrieren, ohne Ihre 50K täglichen Nutzer zu stören.',
      'Ich kann innerhalb von 48 Stunden nach unserem ersten Gespräch einen detaillierten Migrationsplan teilen.',
    ],
  },
  fr: {
    title: 'Générique vs. Optimisé par IA',
    subtitle: 'Voyez la différence que l\'optimisation structurée fait sur la probabilité d\'acceptation.',
    genericLabel: 'Proposition générique',
    optimizedLabel: 'Proposition Sovereign',
    optimizedBadge: 'Optimisé par IA',
    scoreLabel: 'Score d\'acceptation',
    cta: 'Essayer gratuitement',
    genericText: [
      'Cher Responsable du recrutement,',
      'Je vous écris pour exprimer mon intérêt pour le poste dans votre entreprise. J\'ai de l\'expérience en développement web et je pense être un bon candidat pour ce rôle.',
      'Je suis travailleur et j\'ai l\'esprit d\'équipe. Je suis passionné par la technologie et toujours désireux d\'apprendre.',
      'Veuillez trouver mon CV ci-joint. J\'attends votre réponse avec impatience.',
    ],
    optimizedText: [
      'Votre migration d\'un backend PHP monolithique vers des microservices est exactement le défi que j\'ai résolu le trimestre dernier pour une fintech Series B — réduisant les cycles de déploiement de 2 semaines à 4 heures.',
      'Je commencerais par un audit des dépendances de votre architecture actuelle, puis j\'implémenterais un pattern strangler fig pour migrer progressivement sans perturber vos 50K utilisateurs quotidiens.',
      'Je peux partager une feuille de route de migration détaillée dans les 48 heures suivant notre premier appel.',
    ],
  },
};

export const BeforeAfterSection = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-transparent to-card/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {/* Before — Generic */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border-2 border-destructive/20 bg-card p-5 sm:p-6 relative"
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-foreground">{t.genericLabel}</span>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3 mb-6 min-h-[140px]">
              {t.genericText.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">{t.scoreLabel}</span>
              <span className="text-3xl font-bold text-destructive">38%</span>
            </div>
            <div className="mt-2 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: '38%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-destructive rounded-full" 
              />
            </div>
          </motion.div>

          {/* After — Optimized */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border-2 border-green-500/30 bg-card p-5 sm:p-6 relative ring-2 ring-green-500/10 shadow-[0_0_40px_hsl(142_76%_36%/0.08)]"
          >
            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold">
              ✨ {t.optimizedBadge}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-foreground">{t.optimizedLabel}</span>
            </div>
            <div className="text-sm text-foreground leading-relaxed space-y-3 mb-6 min-h-[140px]">
              {t.optimizedText.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">{t.scoreLabel}</span>
              <span className="text-3xl font-bold text-green-500">67%</span>
            </div>
            <div className="mt-2 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: '67%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" 
              />
            </div>
          </motion.div>
        </div>

        {/* CTA below comparison */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-10 md:mt-14"
        >
          <CheckoutButton href={getCheckoutUrl('pro')} variant="gold" size="lg" className="group text-base px-8 py-6 h-auto">
            {t.cta}
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </CheckoutButton>
        </motion.div>
      </div>
    </section>
  );
};
