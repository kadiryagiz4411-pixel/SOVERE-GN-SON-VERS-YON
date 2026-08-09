import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Lock } from 'lucide-react';
import { isPaidPlan, isElitePlan } from '@/lib/plans';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
];

export const CULTURAL_TONES = [
  { id: 'formal', label: 'Formal' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'persuasive', label: 'Persuasive' },
  { id: 'direct', label: 'Direct' },
  { id: 'high-context', label: 'High-context' },
  { id: 'low-context', label: 'Low-context' },
] as const;

export type CulturalTone = typeof CULTURAL_TONES[number]['id'];

interface OutputLanguageSelectorProps {
  plan: string;
  selectedLanguage: string;
  culturalTone: CulturalTone;
  onLanguageChange: (lang: string) => void;
  onCulturalToneChange: (tone: CulturalTone) => void;
}

export const OutputLanguageSelector = ({
  plan,
  selectedLanguage,
  culturalTone,
  onLanguageChange,
  onCulturalToneChange,
}: OutputLanguageSelectorProps) => {
  const isPaid = isPaidPlan(plan);
  const isElite = isElitePlan(plan);

  // Free: English only, Pro: 5 languages, Elite: 50
  const maxLanguages = isElite ? 50 : isPaid ? 5 : 1;
  const availableLanguages = ALL_LANGUAGES.slice(0, maxLanguages);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Output Language
          {!isPaid && <Lock className="w-3 h-3 text-muted-foreground" />}
        </label>
        <Select value={selectedLanguage} onValueChange={onLanguageChange} disabled={!isPaid && selectedLanguage === 'en'}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
              </SelectItem>
            ))}
            {maxLanguages < ALL_LANGUAGES.length && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                +{ALL_LANGUAGES.length - maxLanguages} more with {isPaid ? 'Elite' : 'Pro'}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Cultural Tone - Elite only */}
      {isElite && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cultural Tone</label>
          <div className="flex flex-wrap gap-1.5">
            {CULTURAL_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => onCulturalToneChange(tone.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                  culturalTone === tone.id
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { ALL_LANGUAGES };
