import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Copy, Check, Loader2, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { postLiveFollowup } from '@/lib/liveGenerate';

interface FollowUpKitProps {
  proposal: string;
  jobDescription: string;
  plan: string;
}

const translations = {
  en: {
    title: 'Follow-up Kit',
    subtitle: 'Non-pushy follow-up messages tailored to your application',
    generate: 'Generate Follow-ups',
    generating: 'Crafting messages...',
    day3: '3-Day Follow-up',
    day7: '7-Day Follow-up',
    day3Desc: 'Light check-in — shows initiative without pressure',
    day7Desc: 'Value-add message — provides additional context',
    copied: 'Copied!',
    retry: 'Retry',
    failed: 'Follow-ups could not be written right now. Try again in a moment.',
  },
  tr: {
    title: 'Takip Kiti',
    subtitle: 'Başvurunuza özel, nazik takip mesajları',
    generate: 'Takip Mesajları Oluştur',
    generating: 'Mesajlar hazırlanıyor...',
    day3: '3 Gün Sonra Takip',
    day7: '7 Gün Sonra Takip',
    day3Desc: 'Hafif hatırlatma — baskı yapmadan inisiyatif gösterir',
    day7Desc: 'Değer katan mesaj — ek bağlam sağlar',
    copied: 'Kopyalandı!',
    retry: 'Tekrar dene',
    failed: 'Takip mesajları şu anda yazılamadı. Biraz sonra tekrar deneyin.',
  },
  de: {
    title: 'Follow-up-Kit',
    subtitle: 'Maßgeschneiderte Follow-up-Nachrichten für Ihre Bewerbung',
    generate: 'Follow-ups generieren',
    generating: 'Nachrichten werden erstellt...',
    day3: '3-Tage Follow-up',
    day7: '7-Tage Follow-up',
    day3Desc: 'Leichte Nachfrage — zeigt Initiative ohne Druck',
    day7Desc: 'Mehrwert-Nachricht — bietet zusätzlichen Kontext',
    copied: 'Kopiert!',
    retry: 'Erneut versuchen',
    failed: 'Follow-ups konnten gerade nicht erstellt werden. Versuchen Sie es gleich noch einmal.',
  },
  fr: {
    title: 'Kit de suivi',
    subtitle: 'Messages de relance adaptés à votre candidature',
    generate: 'Générer les relances',
    generating: 'Création des messages...',
    day3: 'Relance à 3 jours',
    day7: 'Relance à 7 jours',
    day3Desc: 'Vérification légère — montre de l\'initiative sans pression',
    day7Desc: 'Message à valeur ajoutée — fournit un contexte supplémentaire',
    copied: 'Copié !',
    retry: 'Réessayer',
    failed: 'Les relances n\'ont pas pu être rédigées. Réessayez dans un instant.',
  },
};

export const FollowUpKit = ({ proposal, jobDescription, plan }: FollowUpKitProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [followUp3, setFollowUp3] = useState('');
  const [followUp7, setFollowUp7] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const live = await postLiveFollowup({
        type: 'followup',
        proposal,
        jobDescription,
        jobContext: jobDescription,
        proposalHistory: proposal,
        previousMessages: proposal,
        language,
        plan,
      });
      const day3 = String(live.data?.followUp3 || '').trim();
      const day7 = String(live.data?.followUp7 || '').trim();
      if (!day3 || !day7) {
        setError(t.failed);
        toast.error(t.failed);
        return;
      }
      setFollowUp3(day3);
      setFollowUp7(day7);
      setIsExpanded(true);
    } catch {
      setError(t.failed);
      toast.error(t.failed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(t.copied);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEmail = (text: string) => {
    const body = encodeURIComponent(text);
    window.open(`mailto:?body=${body}`, '_self');
  };

  if (!followUp3 && !followUp7) {
    return (
      <div className="mt-3 pt-3 border-t border-border space-y-2">
        {error ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs text-foreground mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full gap-2"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              {isGenerating ? t.generating : t.retry}
            </Button>
          </div>
        ) : (
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
              <><Clock className="w-3 h-3" /> {t.title}</>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {t.title}
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* 3-day follow-up */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{t.day3}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(followUp3, '3')}>
                  {copiedId === '3' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEmail(followUp3)}>
                  <Mail className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">{t.day3Desc}</p>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{followUp3}</p>
          </div>

          {/* 7-day follow-up */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{t.day7}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(followUp7, '7')}>
                  {copiedId === '7' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEmail(followUp7)}>
                  <Mail className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">{t.day7Desc}</p>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{followUp7}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full gap-1 text-xs"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
            {isGenerating ? t.generating : language === 'tr' ? 'Yeniden oluştur' : 'Regenerate'}
          </Button>
        </div>
      )}
    </div>
  );
};
