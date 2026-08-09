import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Target, Loader2, ChevronDown, ChevronUp,
  Copy, Check, Zap, AlertTriangle, Sparkles,
  TrendingUp, TrendingDown, MessageSquare, FileText, Briefcase,
} from 'lucide-react';

interface SmartMatchResult {
  jobParsing: {
    requiredSkills: string[];
    yearsOfExperience: string;
    coreTechnologies: string[];
    companyValues: string[];
    roleLevel: string;
    workType: string;
    estimatedSalary: string;
  };
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    experienceMatch: number;
    cultureMatch: number;
    technicalMatch: number;
  };
  platformAcceptance?: {
    upwork: number;
    fiverr: number;
    linkedin: number;
    corporate: number;
  };
  gapAnalysis: {
    strengths: Array<{ area: string; detail: string }>;
    gaps: Array<{ area: string; detail: string; suggestion: string }>;
  };
  coverLetter: string;
  linkedInOutreach: string;
  sampleJobListings?: Array<{ title: string; platform: string; budget: string; matchReason: string }>;
  topAlignmentPoints: string[];
  applicationTips: string[];
  status: string;
}

const translations = {
  en: {
    title: 'Smart Match & Apply',
    subtitle: 'AI analyzes the job, matches your profile, and generates personalized applications',
    analyze: 'Run Smart Match',
    analyzing: 'Analyzing match...',
    requiresPro: 'Requires Pro or Elite plan',
    matchScore: 'Match Score',
    jobParsing: 'Job Requirements',
    skills: 'Required Skills',
    technologies: 'Core Technologies',
    experience: 'Experience',
    values: 'Company Values',
    gapAnalysis: 'Gap Analysis',
    strengths: 'Your Strengths',
    gaps: 'Areas to Improve',
    suggestion: 'Suggestion',
    coverLetter: 'Personalized Cover Letter',
    linkedIn: 'LinkedIn Outreach Message',
    alignmentPoints: 'Top Alignment Points',
    tips: 'Application Tips',
    copied: 'Copied!',
    copy: 'Copy',
    savedToCRM: 'Saved to your Application Pipeline',
    noJobDesc: 'Paste a job description first',
    skillsMatch: 'Skills',
    experienceMatch: 'Experience',
    cultureMatch: 'Culture',
    technicalMatch: 'Technical',
    roleLevel: 'Role Level',
    workType: 'Work Type',
    salary: 'Est. Salary',
    platformAcceptance: 'Platform Acceptance Rates',
    upwork: 'Upwork',
    fiverr: 'Fiverr',
    linkedin: 'LinkedIn',
    corporate: 'Corporate',
    sampleJobs: 'Similar Job Listings',
    budget: 'Budget',
    freeTrial: '1 Free Analysis',
    freeTrialDesc: 'Try Smart Match once for free!',
  },
  tr: {
    title: 'Akıllı Eşleşme ve Başvuru',
    subtitle: 'Yapay zeka iş ilanını analiz eder, profilinizi eşleştirir ve kişiselleştirilmiş başvurular oluşturur',
    analyze: 'Akıllı Eşleşmeyi Çalıştır',
    analyzing: 'Eşleşme analiz ediliyor...',
    requiresPro: 'Pro veya Elite plan gerektirir',
    matchScore: 'Eşleşme Puanı',
    jobParsing: 'İş Gereksinimleri',
    skills: 'Gerekli Yetenekler',
    technologies: 'Temel Teknolojiler',
    experience: 'Deneyim',
    values: 'Şirket Değerleri',
    gapAnalysis: 'Eksiklik Analizi',
    strengths: 'Güçlü Yönleriniz',
    gaps: 'Geliştirilecek Alanlar',
    suggestion: 'Öneri',
    coverLetter: 'Kişiselleştirilmiş Ön Yazı',
    linkedIn: 'LinkedIn İletişim Mesajı',
    alignmentPoints: 'En Önemli Uyum Noktaları',
    tips: 'Başvuru İpuçları',
    copied: 'Kopyalandı!',
    copy: 'Kopyala',
    savedToCRM: 'Başvuru Pipeline\'ınıza kaydedildi',
    noJobDesc: 'Önce bir iş ilanı yapıştırın',
    skillsMatch: 'Yetenekler',
    experienceMatch: 'Deneyim',
    cultureMatch: 'Kültür',
    technicalMatch: 'Teknik',
    roleLevel: 'Pozisyon Seviyesi',
    workType: 'Çalışma Tipi',
    salary: 'Tahmini Maaş',
    platformAcceptance: 'Platform Kabul Oranları',
    upwork: 'Upwork',
    fiverr: 'Fiverr',
    linkedin: 'LinkedIn',
    corporate: 'Kurumsal',
    sampleJobs: 'Benzer İş İlanları',
    budget: 'Bütçe',
    freeTrial: '1 Ücretsiz Analiz',
    freeTrialDesc: 'Smart Match\'i bir kez ücretsiz deneyin!',
  },
  de: {
    title: 'Smart Match & Bewerben',
    subtitle: 'KI analysiert die Stelle, gleicht Ihr Profil ab und erstellt personalisierte Bewerbungen',
    analyze: 'Smart Match starten',
    analyzing: 'Abgleich wird analysiert...',
    requiresPro: 'Erfordert Pro- oder Elite-Plan',
    matchScore: 'Match-Score',
    jobParsing: 'Stellenanforderungen',
    skills: 'Erforderliche Fähigkeiten',
    technologies: 'Kerntechnologien',
    experience: 'Erfahrung',
    values: 'Unternehmenswerte',
    gapAnalysis: 'Lückenanalyse',
    strengths: 'Ihre Stärken',
    gaps: 'Verbesserungsbereiche',
    suggestion: 'Vorschlag',
    coverLetter: 'Personalisiertes Anschreiben',
    linkedIn: 'LinkedIn-Kontaktnachricht',
    alignmentPoints: 'Top-Übereinstimmungspunkte',
    tips: 'Bewerbungstipps',
    copied: 'Kopiert!',
    copy: 'Kopieren',
    savedToCRM: 'In Ihrer Bewerbungs-Pipeline gespeichert',
    noJobDesc: 'Fügen Sie zuerst eine Stellenbeschreibung ein',
    skillsMatch: 'Fähigkeiten',
    experienceMatch: 'Erfahrung',
    cultureMatch: 'Kultur',
    technicalMatch: 'Technik',
    roleLevel: 'Stellenebene',
    workType: 'Arbeitstyp',
    salary: 'Geschätztes Gehalt',
    platformAcceptance: 'Plattform-Akzeptanzraten',
    upwork: 'Upwork',
    fiverr: 'Fiverr',
    linkedin: 'LinkedIn',
    corporate: 'Unternehmen',
    sampleJobs: 'Ähnliche Stellenangebote',
    budget: 'Budget',
    freeTrial: '1 Kostenlose Analyse',
    freeTrialDesc: 'Testen Sie Smart Match einmal kostenlos!',
  },
  fr: {
    title: 'Smart Match & Postuler',
    subtitle: 'L\'IA analyse l\'offre, compare votre profil et génère des candidatures personnalisées',
    analyze: 'Lancer le Smart Match',
    analyzing: 'Analyse de la correspondance...',
    requiresPro: 'Nécessite le plan Pro ou Elite',
    matchScore: 'Score de correspondance',
    jobParsing: 'Exigences du poste',
    skills: 'Compétences requises',
    technologies: 'Technologies clés',
    experience: 'Expérience',
    values: 'Valeurs de l\'entreprise',
    gapAnalysis: 'Analyse des écarts',
    strengths: 'Vos forces',
    gaps: 'Axes d\'amélioration',
    suggestion: 'Suggestion',
    coverLetter: 'Lettre de motivation personnalisée',
    linkedIn: 'Message LinkedIn de prospection',
    alignmentPoints: 'Points d\'alignement clés',
    tips: 'Conseils de candidature',
    copied: 'Copié !',
    copy: 'Copier',
    savedToCRM: 'Enregistré dans votre pipeline de candidatures',
    noJobDesc: 'Collez d\'abord une description de poste',
    skillsMatch: 'Compétences',
    experienceMatch: 'Expérience',
    cultureMatch: 'Culture',
    technicalMatch: 'Technique',
    roleLevel: 'Niveau du poste',
    workType: 'Type de travail',
    salary: 'Salaire estimé',
    platformAcceptance: 'Taux d\'acceptation par plateforme',
    upwork: 'Upwork',
    fiverr: 'Fiverr',
    linkedin: 'LinkedIn',
    corporate: 'Entreprise',
    sampleJobs: 'Offres d\'emploi similaires',
    budget: 'Budget',
    freeTrial: '1 Analyse gratuite',
    freeTrialDesc: 'Essayez Smart Match une fois gratuitement !',
  },
};

interface SmartMatchPanelProps {
  jobDescription: string;
  plan: string;
  outputLanguage: string;
  onUpgrade: () => void;
}

export const SmartMatchPanel = ({ jobDescription, plan, outputLanguage, onUpgrade }: SmartMatchPanelProps) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartMatchResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    jobParsing: true,
    gapAnalysis: true,
    coverLetter: false,
    linkedIn: false,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isPaid = plan === 'pro' || plan === 'elite';
  const isFreePlan = !isPaid;

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t.copied);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 20) {
      toast.error(t.noJobDesc);
      return;
    }

    if (!isPaid) {
      // Allow free trial - the backend handles limiting to 1 free use
    }

    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ jobDescription, outputLanguage }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 403) {
          onUpgrade();
          return;
        }
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait.');
          return;
        }
        throw new Error(err.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      setExpandedSections({ jobParsing: true, gapAnalysis: true, coverLetter: true, linkedIn: true });
      toast.success(t.savedToCRM);
    } catch (err) {
      console.error('Smart Match error:', err);
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'from-green-500/20 to-green-500/5';
    if (score >= 50) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t.title}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Pro+</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t.subtitle}</p>

      {!result && (
        <div>
          {isFreePlan && (
            <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
              <Sparkles className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium text-primary">{t.freeTrial}</p>
              <p className="text-[10px] text-muted-foreground">{t.freeTrialDesc}</p>
            </div>
          )}
          <Button
            variant="gold"
            className="w-full"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jobDescription.trim()}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.analyzing}
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                {isFreePlan ? t.freeTrial : t.analyze}
              </>
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-4 mt-4">
          {/* Match Score */}
          <div className={`rounded-xl p-4 bg-gradient-to-br ${getScoreBg(result.matchScore)} border border-border`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">{t.matchScore}</span>
              <span className={`text-3xl font-bold ${getScoreColor(result.matchScore)}`}>
                {result.matchScore}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t.skillsMatch, value: result.matchBreakdown.skillsMatch },
                { label: t.experienceMatch, value: result.matchBreakdown.experienceMatch },
                { label: t.cultureMatch, value: result.matchBreakdown.cultureMatch },
                { label: t.technicalMatch, value: result.matchBreakdown.technicalMatch },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.value >= 70 ? 'bg-green-500' : item.value >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                    <span className="font-medium text-foreground w-8 text-right">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Acceptance Rates */}
          {result.platformAcceptance && (
            <div className="rounded-xl p-4 border border-primary/20 bg-gradient-to-br from-primary/5 to-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t.platformAcceptance}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t.upwork, value: result.platformAcceptance.upwork, color: 'bg-green-500' },
                  { label: t.fiverr, value: result.platformAcceptance.fiverr, color: 'bg-emerald-500' },
                  { label: t.linkedin, value: result.platformAcceptance.linkedin, color: 'bg-sky-500' },
                  { label: t.corporate, value: result.platformAcceptance.corporate, color: 'bg-violet-500' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-bold text-foreground">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Job Listings */}
          {result.sampleJobListings && result.sampleJobListings.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t.sampleJobs}</span>
              </div>
              <div className="space-y-2">
                {result.sampleJobListings.map((job, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{job.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{job.platform}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">{t.budget}: {job.budget}</div>
                    <div className="text-[10px] text-muted-foreground">{job.matchReason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.topAlignmentPoints?.length > 0 && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">{t.alignmentPoints}</span>
              </div>
              <ul className="space-y-1">
                {result.topAlignmentPoints.map((point, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-green-500 shrink-0">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Job Parsing */}
          <div className="rounded-lg border border-border bg-card">
            <button
              onClick={() => toggleSection('jobParsing')}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-foreground">{t.jobParsing}</span>
              {expandedSections.jobParsing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.jobParsing && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {result.jobParsing.requiredSkills.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.jobParsing.coreTechnologies.map((t, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">{t}</span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">{t.roleLevel}</span>
                    <span className="text-foreground font-medium">{result.jobParsing.roleLevel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t.workType}</span>
                    <span className="text-foreground font-medium">{result.jobParsing.workType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t.experience}</span>
                    <span className="text-foreground font-medium">{result.jobParsing.yearsOfExperience}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gap Analysis */}
          <div className="rounded-lg border border-border bg-card">
            <button
              onClick={() => toggleSection('gapAnalysis')}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-foreground">{t.gapAnalysis}</span>
              {expandedSections.gapAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSections.gapAnalysis && (
              <div className="px-3 pb-3 space-y-3">
                {result.gapAnalysis.strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-green-500">{t.strengths}</span>
                    </div>
                    {result.gapAnalysis.strengths.map((s, i) => (
                      <div key={i} className="text-xs text-muted-foreground ml-4 mb-1">
                        <span className="font-medium text-foreground">{s.area}:</span> {s.detail}
                      </div>
                    ))}
                  </div>
                )}
                {result.gapAnalysis.gaps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingDown className="w-3 h-3 text-amber-500" />
                      <span className="text-xs font-medium text-amber-500">{t.gaps}</span>
                    </div>
                    {result.gapAnalysis.gaps.map((g, i) => (
                      <div key={i} className="text-xs text-muted-foreground ml-4 mb-1">
                        <span className="font-medium text-foreground">{g.area}:</span> {g.detail}
                        {g.suggestion && (
                          <div className="text-primary mt-0.5">💡 {g.suggestion}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cover Letter */}
          <div className="rounded-lg border border-border bg-card">
            <button
              onClick={() => toggleSection('coverLetter')}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t.coverLetter}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleCopy(result.coverLetter, 'cover'); }}
                >
                  {copiedField === 'cover' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
                {expandedSections.coverLetter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {expandedSections.coverLetter && (
              <div className="px-3 pb-3">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                  {result.coverLetter}
                </div>
              </div>
            )}
          </div>

          {/* LinkedIn Outreach */}
          <div className="rounded-lg border border-border bg-card">
            <button
              onClick={() => toggleSection('linkedIn')}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-foreground">{t.linkedIn}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleCopy(result.linkedInOutreach, 'linkedin'); }}
                >
                  {copiedField === 'linkedin' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
                {expandedSections.linkedIn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {expandedSections.linkedIn && (
              <div className="px-3 pb-3">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {result.linkedInOutreach}
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          {result.applicationTips?.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-foreground">{t.tips}</span>
              </div>
              <ul className="space-y-1">
                {result.applicationTips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500 shrink-0">{i + 1}.</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyze button */}
          <Button variant="outline" className="w-full" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
            {t.analyze}
          </Button>
        </div>
      )}
    </div>
  );
};
