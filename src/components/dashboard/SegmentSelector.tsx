import { Briefcase, User as UserIcon } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export type UserSegment = 'freelancer' | 'corporate';

interface SegmentSelectorProps {
  onSelect: (segment: UserSegment) => void;
}

const translations = {
  en: {
    title: 'Who are you applying as?',
    subtitle: 'Choose your path — we\'ll optimize everything for your specific context.',
    freelancer: 'Freelancer',
    freelancerDesc: 'Upwork, Fiverr, Direct Clients, Agency Outreach',
    jobSeeker: 'Job Seeker',
    jobSeekerDesc: 'Corporate applications, ATS-optimized resumes',
  },
  tr: {
    title: 'Nasıl başvuruyorsunuz?',
    subtitle: 'Yolunuzu seçin — her şeyi sizin bağlamınıza göre optimize edeceğiz.',
    freelancer: 'Freelancer',
    freelancerDesc: 'Upwork, Fiverr, Doğrudan Müşteriler, Ajans İletişimi',
    jobSeeker: 'İş Arayan',
    jobSeekerDesc: 'Kurumsal başvurular, ATS uyumlu özgeçmişler',
  },
  de: {
    title: 'Als was bewerben Sie sich?',
    subtitle: 'Wählen Sie Ihren Weg — wir optimieren alles für Ihren Kontext.',
    freelancer: 'Freelancer',
    freelancerDesc: 'Upwork, Fiverr, Direktkunden, Agentur-Outreach',
    jobSeeker: 'Jobsuchender',
    jobSeekerDesc: 'Firmenbewerbungen, ATS-optimierte Lebensläufe',
  },
  fr: {
    title: 'Vous postulez en tant que ?',
    subtitle: 'Choisissez votre voie — nous optimiserons tout pour votre contexte.',
    freelancer: 'Freelance',
    freelancerDesc: 'Upwork, Fiverr, Clients directs, Prospection agence',
    jobSeeker: 'Chercheur d\'emploi',
    jobSeekerDesc: 'Candidatures en entreprise, CV optimisés ATS',
  },
};

export const SegmentSelector = ({ onSelect }: SegmentSelectorProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const segments = [
    {
      id: 'freelancer' as UserSegment,
      icon: Briefcase,
      title: t.freelancer,
      description: t.freelancerDesc,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/20 hover:border-emerald-500/50',
      iconColor: 'text-emerald-500',
    },
    {
      id: 'corporate' as UserSegment,
      icon: UserIcon,
      title: t.jobSeeker,
      description: t.jobSeekerDesc,
      gradient: 'from-primary/10 to-primary/5',
      border: 'border-primary/20 hover:border-primary/50',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex items-center gap-2 mb-2">
        <img src="/pwa-192x192.png" alt="Sovereign" className="w-8 h-8 rounded-lg" />
        <h1 className="text-2xl font-bold text-foreground">Sovereign</h1>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{t.title}</h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
        {t.subtitle}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {segments.map((seg) => (
          <button
            key={seg.id}
            onClick={() => onSelect(seg.id)}
            className={`group relative rounded-xl border ${seg.border} bg-gradient-to-br ${seg.gradient} p-6 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
          >
            <seg.icon className={`w-8 h-8 ${seg.iconColor} mb-3`} />
            <h3 className="text-lg font-semibold text-foreground mb-1">{seg.title}</h3>
            <p className="text-xs text-muted-foreground">{seg.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
