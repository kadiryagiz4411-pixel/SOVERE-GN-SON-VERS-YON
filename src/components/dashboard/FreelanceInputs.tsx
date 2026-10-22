import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORMS, CLUSTERS, type PlatformType, type ClusterCategory } from '@/lib/freelanceClusters';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface FreelanceInputsProps {
  platformType: PlatformType | '';
  professionCluster: ClusterCategory | '';
  selectedProfession: string;
  onPlatformChange: (val: PlatformType) => void;
  onClusterChange: (val: ClusterCategory) => void;
  onProfessionChange: (val: string, label?: string) => void;
  errors?: { category?: string; profession?: string };
}

const translations = {
  en: {
    platform: 'Platform',
    platformPlaceholder: 'Select platform',
    category: 'Profession category',
    categoryPlaceholder: 'Select a category',
    profession: 'Profession',
    pickProfession: 'Choose one profession',
  },
  tr: {
    platform: 'Platform',
    platformPlaceholder: 'Platform seçin',
    category: 'Meslek kategorisi',
    categoryPlaceholder: 'Kategori seçin',
    profession: 'Meslek',
    pickProfession: 'Bir meslek seçin',
  },
  de: {
    platform: 'Plattform',
    platformPlaceholder: 'Plattform wählen',
    category: 'Berufskategorie',
    categoryPlaceholder: 'Kategorie wählen',
    profession: 'Beruf',
    pickProfession: 'Einen Beruf wählen',
  },
  fr: {
    platform: 'Plateforme',
    platformPlaceholder: 'Sélectionner la plateforme',
    category: 'Catégorie professionnelle',
    categoryPlaceholder: 'Sélectionner la catégorie',
    profession: 'Profession',
    pickProfession: 'Choisir une profession',
  },
};

const PLATFORM_NONE = '__platform_none__';
const CLUSTER_NONE = '__cluster_none__';

export const FreelanceInputs = ({
  platformType,
  professionCluster,
  selectedProfession,
  onPlatformChange,
  onClusterChange,
  onProfessionChange,
  errors,
}: FreelanceInputsProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const selectedCluster = CLUSTERS.find((c) => c.id === professionCluster);

  const handlePlatformChange = useCallback((v: string) => {
    if (!v || v === PLATFORM_NONE || v === platformType) return;
    onPlatformChange(v as PlatformType);
  }, [onPlatformChange, platformType]);

  const handleClusterChange = useCallback((v: string) => {
    if (!v || v === CLUSTER_NONE || v === professionCluster) return;
    onClusterChange(v as ClusterCategory);
  }, [onClusterChange, professionCluster]);

  const handleProfessionClick = useCallback((id: string, label: string) => {
    if (id === selectedProfession) return;
    onProfessionChange(id, label);
  }, [onProfessionChange, selectedProfession]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.platform}</label>
        <Select
          value={platformType || PLATFORM_NONE}
          onValueChange={handlePlatformChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.platformPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PLATFORM_NONE} className="hidden">
              {t.platformPlaceholder}
            </SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.category}</label>
        <Select
          value={professionCluster || CLUSTER_NONE}
          onValueChange={handleClusterChange}
        >
          <SelectTrigger className={cn('w-full', errors?.category && 'border-red-500/60')}>
            <SelectValue placeholder={t.categoryPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLUSTER_NONE} className="hidden">
              {t.categoryPlaceholder}
            </SelectItem>
            {CLUSTERS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {`${c.icon} ${c.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.category && !professionCluster && (
          <p className="mt-1 text-[11px] text-red-400">{errors.category}</p>
        )}
      </div>

      {selectedCluster && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.profession}</label>
          <div className="flex flex-wrap gap-1.5">
            {selectedCluster.professions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProfessionClick(p.id, p.label)}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  selectedProfession === p.id
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {errors?.profession && !selectedProfession && (
            <p className="mt-1 text-[11px] text-red-400">{errors.profession}</p>
          )}
        </div>
      )}
    </div>
  );
};
