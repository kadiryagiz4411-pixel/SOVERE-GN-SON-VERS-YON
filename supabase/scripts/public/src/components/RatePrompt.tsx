import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface RatePromptProps {
  open: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
}

export const RatePrompt = ({ open, onClose, onRate }: RatePromptProps) => {
  const { language } = useLanguage();
  const [hovered, setHovered] = useState(0);

  if (!open) return null;

  const title = language === 'tr' ? 'Bu çıktıyı değerlendirir misiniz?' : 'Would you like to rate this output?';
  const skip = language === 'tr' ? 'Geç' : 'Skip';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onRate(star)}
              className="p-1 transition-transform hover:scale-125"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  (hovered || 0) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>{skip}</Button>
      </div>
    </div>
  );
};
