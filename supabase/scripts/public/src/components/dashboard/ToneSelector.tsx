import { useLanguage } from '@/i18n/LanguageContext';

interface ToneSelectorProps {
  selectedTone: string;
  onToneChange: (tone: string) => void;
  hasProposal: boolean;
  onRewrite?: () => void;
}

const translations = {
  en: {
    label: 'Tone of Voice',
    direct: 'Direct / High-Value',
    professional: 'Professional / Corporate',
    friendly: 'Friendly / Casual',
    directDesc: 'Bold, results-focused, authority',
    professionalDesc: 'Formal, structured, traditional',
    friendlyDesc: 'Warm, approachable, conversational',
  },
  tr: {
    label: 'Ses Tonu',
    direct: 'Direkt / Yüksek Değer',
    professional: 'Profesyonel / Kurumsal',
    friendly: 'Samimi / Rahat',
    directDesc: 'Cesur, sonuç odaklı, otoriter',
    professionalDesc: 'Resmi, yapılandırılmış, geleneksel',
    friendlyDesc: 'Sıcak, yaklaşılabilir, sohbet tarzı',
  },
  de: {
    label: 'Tonalität',
    direct: 'Direkt / High-Value',
    professional: 'Professionell / Formell',
    friendly: 'Freundlich / Locker',
    directDesc: 'Mutig, ergebnisorientiert',
    professionalDesc: 'Formell, strukturiert',
    friendlyDesc: 'Warm, gesprächig',
  },
  fr: {
    label: 'Ton de voix',
    direct: 'Direct / Haute valeur',
    professional: 'Professionnel / Corporate',
    friendly: 'Amical / Décontracté',
    directDesc: 'Audacieux, axé sur les résultats',
    professionalDesc: 'Formel, structuré',
    friendlyDesc: 'Chaleureux, conversationnel',
  },
};

const tones = [
  { id: 'direct', emoji: '🎯' },
  { id: 'professional', emoji: '💼' },
  { id: 'friendly', emoji: '😊' },
] as const;

export const ToneSelector = ({ selectedTone, onToneChange }: ToneSelectorProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <div className="mt-3">
      <label className="text-xs font-medium text-muted-foreground mb-2 block">{t.label}</label>
      <div className="grid grid-cols-3 gap-1.5">
        {tones.map((tone) => {
          const label = t[tone.id as keyof typeof t] as string;
          const desc = t[`${tone.id}Desc` as keyof typeof t] as string;
          const isActive = selectedTone === tone.id;

          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => onToneChange(tone.id)}
              className={`text-left px-3 py-2 rounded-lg transition-all text-xs ${
                isActive
                  ? 'bg-primary text-primary-foreground ring-1 ring-primary'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="font-medium flex items-center gap-1">
                {tone.emoji} {label.split(' / ')[0]}
              </span>
              <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
