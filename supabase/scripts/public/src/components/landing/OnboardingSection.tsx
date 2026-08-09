import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { getCheckoutUrl } from '@/lib/plans';
import { ArrowRight, Briefcase, Target, Clock, TrendingUp } from 'lucide-react';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';

interface Question {
  id: string;
  icon: React.ElementType;
  question: string;
  options: string[];
}

export const OnboardingSection = () => {
  const { language } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const content = {
    en: {
      badge: 'Personalized for You',
      title: 'Tell us about your goals',
      subtitle: 'Answer a few quick questions so we can optimize your experience.',
      questions: [
        { id: 'role', icon: Briefcase, question: 'What type of work are you looking for?', options: ['Freelance / Contract', 'Full-time Employment', 'Part-time / Remote', 'Consulting'] },
        { id: 'experience', icon: TrendingUp, question: 'How much experience do you have?', options: ['0-2 years', '3-5 years', '5-10 years', '10+ years'] },
        { id: 'goal', icon: Target, question: 'What is your biggest challenge?', options: ['Getting responses', 'Standing out from competition', 'Writing compelling proposals', 'Finding the right opportunities'] },
        { id: 'volume', icon: Clock, question: 'How many applications do you send per week?', options: ['1-5', '5-15', '15-30', '30+'] },
      ],
      cta: 'Get My Personalized Strategy',
    },
    tr: {
      badge: 'Size Özel',
      title: 'Hedeflerinizi bize anlatın',
      subtitle: 'Deneyiminizi optimize edebilmemiz için birkaç hızlı soruyu yanıtlayın.',
      questions: [
        { id: 'role', icon: Briefcase, question: 'Ne tür bir iş arıyorsunuz?', options: ['Serbest / Sözleşmeli', 'Tam Zamanlı İstihdam', 'Yarı Zamanlı / Uzaktan', 'Danışmanlık'] },
        { id: 'experience', icon: TrendingUp, question: 'Ne kadar deneyiminiz var?', options: ['0-2 yıl', '3-5 yıl', '5-10 yıl', '10+ yıl'] },
        { id: 'goal', icon: Target, question: 'En büyük zorlunuz nedir?', options: ['Yanıt almak', 'Rakiplerden sıyrılmak', 'İkna edici teklifler yazmak', 'Doğru fırsatları bulmak'] },
        { id: 'volume', icon: Clock, question: 'Haftada kaç başvuru gönderiyorsunuz?', options: ['1-5', '5-15', '15-30', '30+'] },
      ],
      cta: 'Kişisel Stratejimi Al',
    },
    de: {
      badge: 'Personalisiert für Sie',
      title: 'Erzählen Sie uns von Ihren Zielen',
      subtitle: 'Beantworten Sie ein paar Fragen, damit wir Ihr Erlebnis optimieren können.',
      questions: [
        { id: 'role', icon: Briefcase, question: 'Welche Art von Arbeit suchen Sie?', options: ['Freelance / Vertrag', 'Vollzeitbeschäftigung', 'Teilzeit / Remote', 'Beratung'] },
        { id: 'experience', icon: TrendingUp, question: 'Wie viel Erfahrung haben Sie?', options: ['0-2 Jahre', '3-5 Jahre', '5-10 Jahre', '10+ Jahre'] },
        { id: 'goal', icon: Target, question: 'Was ist Ihre größte Herausforderung?', options: ['Antworten erhalten', 'Sich von der Konkurrenz abheben', 'Überzeugende Angebote schreiben', 'Die richtigen Möglichkeiten finden'] },
        { id: 'volume', icon: Clock, question: 'Wie viele Bewerbungen senden Sie pro Woche?', options: ['1-5', '5-15', '15-30', '30+'] },
      ],
      cta: 'Meine persönliche Strategie erhalten',
    },
    fr: {
      badge: 'Personnalisé pour vous',
      title: 'Parlez-nous de vos objectifs',
      subtitle: 'Répondez à quelques questions pour optimiser votre expérience.',
      questions: [
        { id: 'role', icon: Briefcase, question: 'Quel type de travail recherchez-vous ?', options: ['Freelance / Contrat', 'Emploi à plein temps', 'Temps partiel / Télétravail', 'Conseil'] },
        { id: 'experience', icon: TrendingUp, question: 'Quelle est votre expérience ?', options: ['0-2 ans', '3-5 ans', '5-10 ans', '10+ ans'] },
        { id: 'goal', icon: Target, question: 'Quel est votre plus grand défi ?', options: ['Obtenir des réponses', 'Se démarquer de la concurrence', 'Rédiger des propositions convaincantes', 'Trouver les bonnes opportunités'] },
        { id: 'volume', icon: Clock, question: 'Combien de candidatures envoyez-vous par semaine ?', options: ['1-5', '5-15', '15-30', '30+'] },
      ],
      cta: 'Obtenir ma stratégie personnalisée',
    },
  };

  const t = content[language] || content.en;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === t.questions.length;

  return (
    <section className="py-24 bg-gradient-to-b from-card to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {t.questions.map((q, i) => {
            const Icon = content.en.questions[i].icon;
            return (
              <div key={q.id} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{q.question}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        answers[q.id] === option
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <CheckoutButton
            href={getCheckoutUrl('pro')}
            variant="gold"
            size="lg"
            className={`text-lg px-8 py-6 h-auto group transition-all ${!allAnswered ? 'opacity-70' : 'shadow-lg shadow-primary/20'}`}
          >
            {t.cta}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </CheckoutButton>
          {answeredCount > 0 && !allAnswered && (
            <p className="text-sm text-muted-foreground mt-3">
              {answeredCount}/{t.questions.length} answered
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
