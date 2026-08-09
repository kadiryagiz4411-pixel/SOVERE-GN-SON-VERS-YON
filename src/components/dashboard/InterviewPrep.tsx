import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Loader2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface InterviewPrepProps {
  jobDescription: string;
  proposal: string;
  plan: string;
  userProfile?: {
    skills?: string[] | null;
    experience?: string | null;
  };
}

interface InterviewQuestion {
  question: string;
  suggestedAnswer: string;
  tip: string;
}

const translations = {
  en: {
    title: 'Interview Strategy',
    subtitle: 'AI-predicted questions based on this specific job',
    generate: 'Predict Interview Questions',
    generating: 'Analyzing job...',
    tip: 'Pro Tip',
    suggestedAnswer: 'Suggested Answer',
  },
  tr: {
    title: 'Mülakat Stratejisi',
    subtitle: 'Bu işe özel AI tahminli sorular',
    generate: 'Mülakat Sorularını Tahmin Et',
    generating: 'İş analiz ediliyor...',
    tip: 'İpucu',
    suggestedAnswer: 'Önerilen Cevap',
  },
  de: {
    title: 'Interview-Strategie',
    subtitle: 'KI-vorhergesagte Fragen basierend auf dieser Stelle',
    generate: 'Interviewfragen vorhersagen',
    generating: 'Stelle wird analysiert...',
    tip: 'Profi-Tipp',
    suggestedAnswer: 'Vorgeschlagene Antwort',
  },
  fr: {
    title: "Stratégie d'entretien",
    subtitle: 'Questions prédites par IA pour ce poste spécifique',
    generate: "Prédire les questions d'entretien",
    generating: 'Analyse du poste...',
    tip: 'Conseil pro',
    suggestedAnswer: 'Réponse suggérée',
  },
};

export const InterviewPrep = ({ jobDescription, proposal, plan, userProfile }: InterviewPrepProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-followup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'interview',
            jobDescription,
            proposal,
            language,
            userProfile: userProfile ? {
              skills: userProfile.skills,
              experience: userProfile.experience,
            } : undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) toast.error('Rate limited. Try again shortly.');
        else if (response.status === 402) toast.error('Credits exhausted.');
        else toast.error('Failed to generate questions');
        return;
      }

      const result = await response.json();
      setQuestions(result.questions || []);
      if (result.questions?.length > 0) setExpandedQ(0);
    } catch (err) {
      console.error('Interview prep error:', err);
      toast.error('Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t.subtitle}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          {isGenerating ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {t.generating}</>
          ) : (
            <><MessageSquare className="w-3 h-3" /> {t.generate}</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="text-xs h-7 gap-1"
        >
          {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
          ↻
        </Button>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
            <button
              onClick={() => setExpandedQ(expandedQ === i ? null : i)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-left"
            >
              <span className="text-xs font-medium text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {q.question}
              </span>
              {expandedQ === i ? <ChevronUp className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />}
            </button>

            {expandedQ === i && (
              <div className="px-3 pb-3 space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{t.suggestedAnswer}</span>
                  <p className="text-xs text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{q.suggestedAnswer}</p>
                </div>
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">{t.tip}: {q.tip}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
