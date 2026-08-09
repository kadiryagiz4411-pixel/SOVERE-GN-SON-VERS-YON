import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORMS, CLUSTERS, type PlatformType, type ClusterCategory, type Profession } from '@/lib/freelanceClusters';
import { useLanguage } from '@/i18n/LanguageContext';

interface FreelanceInputsProps {
  platformType: PlatformType | '';
  professionCluster: ClusterCategory | '';
  selectedProfession: string;
  onPlatformChange: (val: PlatformType) => void;
  onClusterChange: (val: ClusterCategory) => void;
  onProfessionChange: (val: string) => void;
}

const translations = {
  en: {
    platform: 'Platform',
    platformPlaceholder: 'Select platform...',
    category: 'Profession Category',
    categoryPlaceholder: 'Select category...',
    profession: 'Profession',
    professionPlaceholder: 'Select profession...',
  },
  tr: {
    platform: 'Platform',
    platformPlaceholder: 'Platform seçin...',
    category: 'Meslek Kategorisi',
    categoryPlaceholder: 'Kategori seçin...',
    profession: 'Meslek',
    professionPlaceholder: 'Meslek seçin...',
  },
  de: {
    platform: 'Plattform',
    platformPlaceholder: 'Plattform wählen...',
    category: 'Berufskategorie',
    categoryPlaceholder: 'Kategorie wählen...',
    profession: 'Beruf',
    professionPlaceholder: 'Beruf wählen...',
  },
  fr: {
    platform: 'Plateforme',
    platformPlaceholder: 'Sélectionner la plateforme...',
    category: 'Catégorie professionnelle',
    categoryPlaceholder: 'Sélectionner la catégorie...',
    profession: 'Profession',
    professionPlaceholder: 'Sélectionner la profession...',
  },
};

export const FreelanceInputs = ({
  platformType,
  professionCluster,
  selectedProfession,
  onPlatformChange,
  onClusterChange,
  onProfessionChange,
}: FreelanceInputsProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const selectedCluster = CLUSTERS.find((c) => c.id === professionCluster);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.platform}</label>
        <Select value={platformType} onValueChange={(v) => onPlatformChange(v as PlatformType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.platformPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex flex-col">
                  <span>{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.category}</label>
        <Select value={professionCluster} onValueChange={(v) => { onClusterChange(v as ClusterCategory); onProfessionChange(''); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.categoryPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {CLUSTERS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCluster && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t.profession}</label>
          <Select value={selectedProfession} onValueChange={onProfessionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.professionPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {selectedCluster.professions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
