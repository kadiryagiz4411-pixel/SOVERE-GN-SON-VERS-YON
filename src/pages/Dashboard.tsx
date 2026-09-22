import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { MobileBottomNav, SwipeablePageWrapper } from '@/components/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileByAuthId } from '@/lib/profileQuery';
import { useSession } from '@/contexts/SessionContext';
import { usePlan } from '@/contexts/PlanContext';
import { OWNER_EMAIL, SUPERADMIN_PLAN_LABEL, SUPERADMIN_PLAN_TYPE } from '@/lib/superadmin';
import { saveProposal, getRecentProposals } from '@/lib/proposals';
import { getDailyLimit, isPaidPlan, canAccessFeature, PLAN_PRICES, isElitePlan, getDownloadLimit, CREDIT_COSTS } from '@/lib/plans';
import { COST_PER_ACTION, hasActionCredits } from '@/lib/credits';
import { generateSovereignContent, generateProposalFallback } from '@/services/aiService';
import { supabaseAnonKey } from '@/integrations/supabase/client';
import { exportProposalAsPDF, exportProposalAsDOCX } from '@/lib/cvExport';
import { getDownloadsUsedToday, incrementDownloadsUsed, canDownloadWithoutWatermark, incrementFreePremiumDownloads } from '@/lib/downloads';
import { getProposalViewsUsed, incrementProposalViews, canViewProposal, getProposalViewsRemaining, FREE_VIEW_LIMIT } from '@/lib/proposalViews';
import { FeatureUpgradeModal } from '@/components/FeatureUpgradeModal';
import { InsufficientCreditsModal } from '@/components/credits/InsufficientCreditsModal';
import { EliteAnalytics } from '@/components/dashboard/EliteAnalytics';
import { JobRecommendations } from '@/components/dashboard/JobRecommendations';
import { DetailedAnalysisReport } from '@/components/dashboard/DetailedAnalysisReport';
import { CareerRoadmap } from '@/components/dashboard/CareerRoadmap';
import { FeaturePanel } from '@/components/dashboard/FeaturePanel';
import { CVOptimizerModal } from '@/components/dashboard/CVOptimizerModal';
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner';
import { AppShell } from '@/components/AppShell';
import { ReviewForm } from '@/components/dashboard/ReviewForm';
import { BonusCreditsBanner } from '@/components/dashboard/BonusCreditsBanner';
import { CreditActivityPanel, type CreditActivityItem } from '@/components/dashboard/CreditActivityPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { ATSAnalyzer } from '@/components/ATSAnalyzer';
import { SegmentSelector, type UserSegment } from '@/components/dashboard/SegmentSelector';
import { FreelanceInputs } from '@/components/dashboard/FreelanceInputs';
import { FreelanceScoreDisplay } from '@/components/dashboard/FreelanceScoreDisplay';
import { OutputLanguageSelector, type CulturalTone } from '@/components/dashboard/OutputLanguageSelector';
import { ToneSelector } from '@/components/dashboard/ToneSelector';
import { FollowUpKit } from '@/components/dashboard/FollowUpKit';
import { SmartMatchPanel } from '@/components/dashboard/SmartMatchPanel';
import { InterviewPrep } from '@/components/dashboard/InterviewPrep';
import { type PlatformType, type ClusterCategory, calculateFreelanceScore, type FreelanceScoreBreakdown } from '@/lib/freelanceClusters';
import { type CompetitiveScoreResult } from '@/lib/competitiveScoring';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from '@supabase/supabase-js';
import {
  Plus, FileText, Settings, User as UserIcon, LogOut, Sparkles,
  Copy, Check, RefreshCw, Zap, Loader2, Lock, Download, Shield,
  ArrowRight, Send, Mail, ExternalLink, Building2, Wand2, Share2, Link as LinkIcon, Crown, Coins, Target,
  AlertCircle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';


interface Profile {
  full_name: string | null;
  skills: string[] | null;
  experience: string | null;
  hourly_rate: number | null;
  daily_proposals_used: number;
  subscription_plan: string;
  trial_started_at: string | null;
  trial_claimed: boolean;
  onboarding_role: string | null;
  onboarding_experience: string | null;
  onboarding_goal: string | null;
  onboarding_volume: string | null;
  onboarding_completed: boolean;
  career_roadmap: any;
  bonus_credits: number;
  credits_balance: number;
  remaining_credits?: number;
  monthly_credit_limit?: number;
  user_segment?: string | null;
  platform_type?: string | null;
  profession_cluster?: string | null;
  subscription_expires_at?: string | null;
  billing_period?: string | null;
  appsumo_tier?: number | null;
}

interface Proposal {
  id: string;
  job_description: string;
  generated_proposal: string;
  status: string;
  created_at: string;
}

const CREDIT_ACTIVITY_LIMIT = 8;

const Dashboard = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, sessionReady, remainingCredits, isByokUnlimited, hasBYOKAccess, hasB2BAccess, user: sessionUser } = useSession();
  const { planLabel: contextPlanLabel, isSuperAdmin: contextSuperAdmin } = usePlan();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentProposals, setRecentProposals] = useState<Proposal[]>([]);
  const [creditActivity, setCreditActivity] = useState<CreditActivityItem[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState('');
  const [proposalVariants, setProposalVariants] = useState<Array<{id: string; label: string; badge: string; description: string; text: string}> | null>(null);
  const [activeVariant, setActiveVariant] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [downloadsUsed, setDownloadsUsed] = useState(() => getDownloadsUsedToday());
  const [proposalViewsUsed, setProposalViewsUsed] = useState(() => getProposalViewsUsed());
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const { isAdmin } = useAdmin(user);
  const [showCVOptimizer, setShowCVOptimizer] = useState(false);

  // Segmentation state
  const [userSegment, setUserSegment] = useState<UserSegment | null>(null);
  const [platformType, setPlatformType] = useState<PlatformType | ''>('');
  const [professionCluster, setProfessionCluster] = useState<ClusterCategory | ''>('');
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [freelanceScore, setFreelanceScore] = useState<FreelanceScoreBreakdown | null>(null);
  const [competitiveScoreResult, setCompetitiveScoreResult] = useState<CompetitiveScoreResult | null>(null);

  // Output language
  const [outputLanguage, setOutputLanguage] = useState<string>('en');
  const [culturalTone, setCulturalTone] = useState<CulturalTone>('neutral');

  // Auto-fill state
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillApplied, setAutoFillApplied] = useState(false);
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);

  // Custom profession / specialty (injected into AI system prompt)
  const [customProfession, setCustomProfession] = useState<string>('');

  // ATS Analyzer
  const [showATSAnalyzer, setShowATSAnalyzer] = useState(false);

  // Check subscription expiry on frontend
  const checkSubscriptionExpiry = () => {
    if (!profile) return profile?.subscription_plan || 'free';
    const plan = profile.subscription_plan || 'free';
    if ((plan === 'pro' || plan === 'elite') && (profile as any).subscription_expires_at) {
      const expiry = new Date((profile as any).subscription_expires_at);
      if (new Date() > expiry) {
        return 'free'; // Expired, treat as free
      }
    }
    return plan;
  };

  const isSuperAdmin =
    user?.email === OWNER_EMAIL ||
    sessionUser?.email === OWNER_EMAIL ||
    session.user?.email === OWNER_EMAIL ||
    contextSuperAdmin;
  const currentPlan = (
    isSuperAdmin || hasB2BAccess
      ? SUPERADMIN_PLAN_TYPE
      : Number(profile?.appsumo_tier ?? 0) >= 3
        ? 'elite'
        : Number(profile?.appsumo_tier ?? 0) >= 2
          ? 'pro'
          : Number(profile?.appsumo_tier ?? 0) >= 1
            ? 'standard'
            : checkSubscriptionExpiry()
  );
  const isFreePlan = !isSuperAdmin && !isPaidPlan(currentPlan);
  const dailyLimit = getDailyLimit(currentPlan);
  const proposalsUsed = profile?.daily_proposals_used || 0;
  const bonusCredits = profile?.bonus_credits || 0;
  const proposalsLeft = dailyLimit === Infinity ? 'Unlimited' : Math.max(0, dailyLimit - proposalsUsed + bonusCredits);
  const hasUnlimitedProposals = dailyLimit === Infinity;

  const txt = t.dashboard;

  const dashboardUiText = useMemo(() => {
    const copy = {
      en: {
        welcome: 'Welcome back',
        memberWorkspace: 'Your workspace is ready. Create high-converting proposals, pitch B2B clients, and optimize your CV — all from one place.',
        creditBalance: 'Credit balance',
        buyCredits: 'Buy credits',
        currentPlan: 'Current plan',
        proposalQuota: 'Proposal usage',
        activeMode: 'Active mode',
        desktopReady: 'Desktop-wide layout, mobile-first flow.',
        quickActions: 'Quick actions',
        quickActionsDesc: 'Jump directly to the tool you need.',
        membershipTitle: 'Membership overview',
        membershipDesc: 'Track plan status, remaining limits, and the fastest upgrade path.',
        statusActive: 'Active',
        proposalsRemaining: 'Proposals',
        downloadsRemaining: 'Downloads',
        creditsReady: 'Credits',
        usageToday: 'Today\'s usage',
        monthlyBilling: 'Annual billing',
        monthlyPlan: 'Monthly billing',
        freePlanHint: 'Unlock more proposal capacity and advanced matching with Pro.',
        proPlanHint: 'Step up to Elite for deeper strategy and outreach features.',
        elitePlanHint: 'You are on the highest tier with the full premium toolkit.',
        upgradeNow: 'See upgrade options',
        topUpNow: 'Top up now',
        startGenerating: 'Create New Proposal',
        startGeneratingDesc: 'Paste a client brief or job listing — get a high-converting proposal in seconds.',
        viewHistory: 'View history',
        viewHistoryDesc: 'Open saved applications and continue from where you left off.',
        editProfile: 'Edit profile',
        editProfileDesc: 'Update your positioning, skills, and pricing details.',
        managePlan: 'Manage plan',
        managePlanDesc: 'Upgrade plan or buy more credits when needed.',
        freelancerMode: 'Freelancer',
        corporateMode: 'Corporate',
        availableNow: 'Available now',
        unlimited: 'Unlimited',
        paymentProvider: 'Payments are processed securely with Lemon Squeezy.',
        creditHealthyTitle: 'Credit balance looks strong',
        creditHealthyDesc: 'You have enough credits for smooth generation and exports.',
        creditLowTitle: 'Low credit warning',
        creditLowDesc: 'Your balance is getting low. Add credits soon to avoid interruptions.',
        creditEmptyTitle: 'Credits are exhausted',
        creditEmptyDesc: 'Add credits to continue generating premium outputs without interruptions.',
        navCvBuilder: 'CV Builder',
        navPipeline: 'Pipeline',
        switchMode: 'Switch mode',
        segmentFreelancer: '💼 Freelancer',
        segmentCorporate: '🏢 Corporate',
      },
      tr: {
        welcome: 'Tekrar hoş geldin',
        memberWorkspace: 'Üye panelin hazır. İş ilanlarını analiz et, daha güçlü proposal üret ve kredilerini tek yerden yönet.',
        creditBalance: 'Kredi bakiyesi',
        buyCredits: 'Kredi al',
        currentPlan: 'Mevcut plan',
        proposalQuota: 'Proposal kullanımı',
        activeMode: 'Aktif mod',
        desktopReady: 'Masaüstünde geniş, mobilde doğal dikey akış.',
        quickActions: 'Hızlı işlemler',
        quickActionsDesc: 'İhtiyacın olan araca direkt geç.',
        membershipTitle: 'Üyelik özeti',
        membershipDesc: 'Plan durumunu, kalan haklarını ve en doğru yükseltme yolunu takip et.',
        statusActive: 'Aktif',
        proposalsRemaining: 'Proposal',
        downloadsRemaining: 'İndirme',
        creditsReady: 'Kredi',
        usageToday: 'Bugünkü kullanım',
        monthlyBilling: 'Yıllık faturalama',
        monthlyPlan: 'Aylık faturalama',
        freePlanHint: 'Daha fazla proposal kapasitesi ve gelişmiş eşleşme için Pro\'ya geç.',
        proPlanHint: 'Daha derin strateji ve outreach özellikleri için Elite\'e yükselt.',
        elitePlanHint: 'Tüm premium araçlarla en üst plandasın.',
        upgradeNow: 'Yükseltme seçenekleri',
        topUpNow: 'Hemen kredi yükle',
        startGenerating: 'Yeni Başvuruyu Optimize Et',
        startGeneratingDesc: 'İş ilanını yapıştır; ATS eşleşmesi ve hedefli başvuru üret.',
        viewHistory: 'Geçmişi aç',
        viewHistoryDesc: 'Kayıtlı proposalları görüntüle ve kaldığın yerden devam et.',
        editProfile: 'Profili düzenle',
        editProfileDesc: 'Konumlandırmanı, yeteneklerini ve fiyat bilgilerini güncelle.',
        managePlan: 'Planı yönet',
        managePlanDesc: 'Gerektiğinde plan yükselt veya ekstra kredi al.',
        freelancerMode: 'Freelancer',
        corporateMode: 'Kurumsal',
        availableNow: 'Şu an kullanılabilir',
        unlimited: 'Sınırsız',
        paymentProvider: 'Ödemeler Lemon Squeezy ile güvenli şekilde işlenir.',
        creditHealthyTitle: 'Kredi bakiyen güçlü görünüyor',
        creditHealthyDesc: 'Akıcı üretim ve dışa aktarma için yeterli kredin var.',
        creditLowTitle: 'Düşük bakiye uyarısı',
        creditLowDesc: 'Bakiyen azalıyor. Kesinti yaşamamak için yakında kredi ekle.',
        creditEmptyTitle: 'Kredin tükendi',
        creditEmptyDesc: 'Premium çıktılara kesintisiz devam etmek için kredi ekle.',
        navCvBuilder: 'CV Oluştur',
        navPipeline: 'Başvuru Takibi',
        switchMode: 'Mod değiştir',
        segmentFreelancer: '💼 Freelancer',
        segmentCorporate: '🏢 Kurumsal',
      },
      de: {
        welcome: 'Willkommen zurück',
        memberWorkspace: 'Ihr Mitgliederbereich ist bereit. Analysieren Sie Jobs, erstellen Sie stärkere Vorschläge und verwalten Sie Credits an einem Ort.',
        creditBalance: 'Credit-Guthaben',
        buyCredits: 'Credits kaufen',
        currentPlan: 'Aktueller Plan',
        proposalQuota: 'Proposal-Nutzung',
        activeMode: 'Aktiver Modus',
        desktopReady: 'Breites Desktop-Layout, natürlicher mobiler Hochformatfluss.',
        quickActions: 'Schnellzugriffe',
        quickActionsDesc: 'Direkt zum passenden Tool springen.',
        membershipTitle: 'Mitgliedschaftsübersicht',
        membershipDesc: 'Planstatus, verbleibende Limits und den schnellsten Upgrade-Pfad im Blick behalten.',
        statusActive: 'Aktiv',
        proposalsRemaining: 'Proposals',
        downloadsRemaining: 'Downloads',
        creditsReady: 'Credits',
        usageToday: 'Heutige Nutzung',
        monthlyBilling: 'Jährliche Abrechnung',
        monthlyPlan: 'Monatliche Abrechnung',
        freePlanHint: 'Schalten Sie mit Pro mehr Proposal-Kapazität und besseres Matching frei.',
        proPlanHint: 'Wechseln Sie zu Elite für tiefere Strategie- und Outreach-Funktionen.',
        elitePlanHint: 'Sie nutzen bereits die höchste Stufe mit dem kompletten Premium-Toolkit.',
        upgradeNow: 'Upgrade-Optionen',
        topUpNow: 'Jetzt aufladen',
        startGenerating: 'Jetzt starten',
        startGeneratingDesc: 'Job oder Kundenbriefing einfügen und schnell ein starkes Ergebnis erhalten.',
        viewHistory: 'Verlauf öffnen',
        viewHistoryDesc: 'Gespeicherte Proposals öffnen und nahtlos fortsetzen.',
        editProfile: 'Profil bearbeiten',
        editProfileDesc: 'Positionierung, Skills und Preise aktualisieren.',
        managePlan: 'Plan verwalten',
        managePlanDesc: 'Plan upgraden oder bei Bedarf mehr Credits kaufen.',
        freelancerMode: 'Freelancer',
        corporateMode: 'Unternehmen',
        availableNow: 'Jetzt verfügbar',
        unlimited: 'Unbegrenzt',
        paymentProvider: 'Zahlungen werden sicher über Lemon Squeezy verarbeitet.',
        creditHealthyTitle: 'Ihr Credit-Guthaben ist solide',
        creditHealthyDesc: 'Sie haben genug Credits für reibungslose Generierung und Exporte.',
        creditLowTitle: 'Warnung: Wenig Credits',
        creditLowDesc: 'Ihr Guthaben wird knapp. Laden Sie bald auf, um Unterbrechungen zu vermeiden.',
        creditEmptyTitle: 'Credits aufgebraucht',
        creditEmptyDesc: 'Laden Sie Credits auf, um Premium-Ausgaben ohne Unterbrechung fortzusetzen.',
        navCvBuilder: 'CV-Editor',
        navPipeline: 'Bewerbungen',
        switchMode: 'Modus wechseln',
        segmentFreelancer: '💼 Freelancer',
        segmentCorporate: '🏢 Unternehmen',
      },
      fr: {
        welcome: 'Bon retour',
        memberWorkspace: 'Votre espace membre est prêt. Analysez les offres, créez de meilleurs proposals et gérez vos crédits au même endroit.',
        creditBalance: 'Solde de crédits',
        buyCredits: 'Acheter des crédits',
        currentPlan: 'Plan actuel',
        proposalQuota: 'Utilisation des proposals',
        activeMode: 'Mode actif',
        desktopReady: 'Mise en page large sur desktop, fluide en vertical sur mobile.',
        quickActions: 'Accès rapides',
        quickActionsDesc: 'Accédez directement à l\'outil voulu.',
        membershipTitle: 'Aperçu de l\'abonnement',
        membershipDesc: 'Suivez votre plan, vos limites restantes et la meilleure option d\'évolution.',
        statusActive: 'Actif',
        proposalsRemaining: 'Proposals',
        downloadsRemaining: 'Downloads',
        creditsReady: 'Crédits',
        usageToday: 'Utilisation du jour',
        monthlyBilling: 'Facturation annuelle',
        monthlyPlan: 'Facturation mensuelle',
        freePlanHint: 'Passez à Pro pour plus de capacité et un matching avancé.',
        proPlanHint: 'Passez à Elite pour une stratégie plus poussée et des outils d\'outreach.',
        elitePlanHint: 'Vous utilisez déjà le plus haut niveau avec toute la suite premium.',
        upgradeNow: 'Voir les options',
        topUpNow: 'Recharger maintenant',
        startGenerating: 'Commencer',
        startGeneratingDesc: 'Collez une offre ou un brief client et obtenez vite un résultat solide.',
        viewHistory: 'Voir l\'historique',
        viewHistoryDesc: 'Ouvrez vos proposals enregistrées et reprenez où vous en étiez.',
        editProfile: 'Modifier le profil',
        editProfileDesc: 'Mettez à jour votre positionnement, vos compétences et vos tarifs.',
        managePlan: 'Gérer le plan',
        managePlanDesc: 'Améliorez le plan ou achetez plus de crédits si nécessaire.',
        freelancerMode: 'Freelance',
        corporateMode: 'Entreprise',
        availableNow: 'Disponible maintenant',
        unlimited: 'Illimité',
        paymentProvider: 'Les paiements sont traités en toute sécurité via Lemon Squeezy.',
        creditHealthyTitle: 'Votre solde de crédits est solide',
        creditHealthyDesc: 'Vous avez assez de crédits pour générer et exporter sans friction.',
        creditLowTitle: 'Alerte crédit faible',
        creditLowDesc: 'Votre solde baisse. Ajoutez bientôt des crédits pour éviter les interruptions.',
        creditEmptyTitle: 'Crédits épuisés',
        creditEmptyDesc: 'Ajoutez des crédits pour continuer à générer des sorties premium sans interruption.',
        navCvBuilder: 'CV Builder',
        navPipeline: 'Candidatures',
        switchMode: 'Changer de mode',
        segmentFreelancer: '💼 Freelance',
        segmentCorporate: '🏢 Entreprise',
      },
    };

    return copy[language as keyof typeof copy] || copy.en;
  }, [language]);

  // Auth check + referral processing
  useEffect(() => {
    const fetchCreditActivity = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('id, amount, balance_after, created_at, transaction_type, description, reference_type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(CREDIT_ACTIVITY_LIMIT);

        if (error) {
          console.warn('Failed to fetch credit activity:', error);
          return;
        }
        setCreditActivity((data || []) as CreditActivityItem[]);
      } catch (err) {
        console.warn('Credit activity fetch error (non-fatal):', err);
      }
    };

    /** Build a safe fallback profile for newly-registered users. */
    const buildDefaultProfile = (userId: string): Profile => ({
      full_name: null,
      skills: [],
      experience: null,
      hourly_rate: null,
      daily_proposals_used: 0,
      subscription_plan: 'free',
      trial_started_at: null,
      trial_claimed: false,
      onboarding_role: null,
      onboarding_experience: null,
      onboarding_goal: null,
      onboarding_volume: null,
      onboarding_completed: false,
      career_roadmap: null,
      bonus_credits: 0,
      credits_balance: 0,
      remaining_credits: 0,
      monthly_credit_limit: 400,
      user_segment: null,
      platform_type: null,
      profession_cluster: null,
      subscription_expires_at: null,
      billing_period: null,
    });

    /** Fetch profile; if missing (new user / 400) auto-upsert a default row. */
    const fetchOrCreateProfile = async (userId: string, email: string | undefined): Promise<Profile> => {
      if (!userId) return buildDefaultProfile(userId);
      try {
        const { data, error } = await fetchProfileByAuthId<Profile>(userId, '*, appsumo_tier');

        if (error) {
          console.error('[Sovereign Load Error]:', 'Profile fetch returned error (will create default):', error.message);
        }

        if (data) return data as Profile;

        // No row found — create one so subsequent queries never 400-fail
        const defaultProfile = {
          user_id: userId,
          full_name: email?.split('@')[0] ?? null,
          subscription_plan: 'free',
          daily_proposals_used: 0,
          bonus_credits: 0,
          credits_balance: 0,
          trial_claimed: false,
          onboarding_completed: false,
        };

        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert(defaultProfile, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();

        if (createErr) {
          console.error('[Sovereign Load Error]:', 'Could not create default profile (non-fatal):', createErr.message);
        }

        return (created as Profile | null) ?? buildDefaultProfile(userId);
      } catch (err) {
        console.error('[Sovereign Load Error]:', 'fetchOrCreateProfile error (using in-memory fallback):', err);
        return buildDefaultProfile(userId);
      }
    };

    const checkAuth = async () => {
      if (!sessionReady) return;
      try {
        if (!session?.user?.id) {
          navigate('/auth');
          return;
        }
        setUser(session.user);

        const profileData = await fetchOrCreateProfile(session.user.id, session.user.email);
        setProfile(profileData);

        // Restore segment from profile
        if (profileData?.user_segment) {
          setUserSegment(profileData.user_segment as UserSegment);
        }
        if (profileData?.platform_type) {
          setPlatformType(profileData.platform_type as PlatformType);
        }
        if (profileData?.profession_cluster) {
          setProfessionCluster(profileData.profession_cluster as ClusterCategory);
        }

        await fetchCreditActivity(session.user.id);

        // ── Payment success notification ──────────────────────────────────
        // Lemon Squeezy redirects to /dashboard?payment=success after checkout.
        const paymentParam = searchParams.get('payment');
        if (paymentParam === 'success') {
          setTimeout(() => {
            toast.success(
              language === 'tr'
                ? '🎉 Ödeme alındı! Planın güncelleniyor — birkaç saniye bekle.'
                : '🎉 Payment confirmed! Your plan is being activated — refresh in a moment.',
              { duration: 8000 },
            );
          }, 800);
          navigate('/dashboard', { replace: true });
        }

        // Process referral if ?ref= param exists
        const refCode = searchParams.get('ref');
        if (refCode) {
          try {
            await supabase.functions.invoke('process-referral', {
              body: { referral_code: refCode, new_user_id: session.user.id },
            });
            navigate('/dashboard', { replace: true });
          } catch {
            // Silent fail — referral is non-critical
          }
        }

        // Check milestone: every 10 proposals → award 5 bonus credits
        if (profileData && (profileData.daily_proposals_used ?? 0) > 0 && profileData.daily_proposals_used % 10 === 0) {
          const newBonus = (profileData.bonus_credits || 0) + 5;
          await supabase.from('profiles').update({ bonus_credits: newBonus }).eq('user_id', session.user.id);
          toast.success(language === 'tr' ? '🎁 Kilometre taşı! +5 bonus proposal hakkı kazandın!' : language === 'de' ? '🎁 Meilenstein! +5 Bonus-Proposals erhalten!' : language === 'fr' ? '🎁 Jalon atteint ! +5 proposals bonus accordées !' : '🎁 Milestone reached! +5 bonus proposals awarded!');
          profileData.bonus_credits = newBonus;
        }

        try {
          const proposals = await getRecentProposals(session.user.id, 5);
          setRecentProposals(proposals);
        } catch (err) {
          console.warn('Failed to fetch proposals (non-fatal):', err);
        }
      } catch (err) {
        console.error('[Sovereign Load Error]:', 'Dashboard auth/load error:', err);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [navigate, searchParams, sessionReady, session?.user?.id]);

  const handleSegmentSelect = async (segment: UserSegment) => {
    setUserSegment(segment);
    if (user) {
      await supabase.from('profiles').update({ user_segment: segment }).eq('user_id', user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Auto-fill: AI analyzes job description and fills platform/cluster/tone
  const handleAutoFill = async () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 20) {
      toast.error(language === 'tr' ? 'Önce bir iş ilanı yapıştırın (min 20 karakter)' : language === 'de' ? 'Zuerst eine Stellenbeschreibung einfügen (min. 20 Zeichen)' : language === 'fr' ? 'Collez d\'abord une description (min 20 caractères)' : 'Paste a job description first (min 20 characters)');
      return;
    }
    if (!isPaidPlan(currentPlan)) {
      setUpgradeFeature('AI Auto-Fill');
      setShowUpgradeModal(true);
      return;
    }

    setIsAutoFilling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(language === 'tr' ? 'Lütfen giriş yapın' : 'Please log in'); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-fill-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ jobDescription }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || (language === 'tr' ? 'Otomatik doldurma başarısız' : 'Auto-fill failed'));
        return;
      }

      const { autofill } = result;

      // Apply detected values
      if (autofill.segment) {
        setUserSegment(autofill.segment as UserSegment);
      }
      if (autofill.platformType) {
        setPlatformType(autofill.platformType as PlatformType);
      }
      if (autofill.professionCluster) {
        setProfessionCluster(autofill.professionCluster as ClusterCategory);
      }
      if (autofill.suggestedProfession) {
        setSelectedProfession(autofill.suggestedProfession);
      }
      if (autofill.suggestedTone) {
        setSelectedTone(autofill.suggestedTone);
      }
      if (autofill.detectedLanguage) {
        setOutputLanguage(autofill.detectedLanguage);
      }

      setAutoFillApplied(true);
      setTimeout(() => setAutoFillApplied(false), 3000);

      const confidenceLabel = autofill.confidence > 0.7 ? 'high' : autofill.confidence > 0.4 ? 'medium' : 'low';
      toast.success(`✨ Auto-filled with ${confidenceLabel} confidence! Fields updated automatically.`);

      // Elite: auto-generate after auto-fill
      if (isElitePlan(currentPlan) && !autoGenerateTriggered) {
        setAutoGenerateTriggered(true);
        // Small delay so user sees the auto-fill result
        setTimeout(() => {
          handleGenerate();
        }, 800);
      }
    } catch (err) {
      console.error('Auto-fill error:', err);
      toast.error(language === 'tr' ? 'Otomatik doldurma başarısız. Tekrar deneyin.' : 'Auto-fill failed. Please try again.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast.error(language === 'tr' ? 'Lütfen bir iş ilanı girin' : language === 'de' ? 'Bitte eine Stellenbeschreibung eingeben' : language === 'fr' ? 'Veuillez saisir une description de poste' : 'Please enter a job description');
      return;
    }

    if (!user) {
      // Show auth modal rather than navigating away so the user doesn't lose their draft.
      toast.error(
        language === 'tr' ? 'Proposal üretmek için giriş yapın' : 'Please sign in to generate proposals',
        { action: { label: 'Sign in', onClick: () => navigate('/auth?mode=signup') } },
      );
      return;
    }

    // Credit check — block ALL plans when credits are below COST_PER_ACTION
    const currentCredits = profile?.credits_balance ?? 0;
    if (!hasActionCredits(currentCredits)) {
      setShowCreditsModal(true);
      return;
    }

    if (!hasUnlimitedProposals && typeof proposalsLeft === 'number' && proposalsLeft <= 0) {
      setUpgradeFeature('Unlimited Proposals');
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setProposalVariants(null);
    setActiveVariant('');
    setFreelanceScore(null);
    setCompetitiveScoreResult(null);

    // Safety valve: reset isGenerating after 60 s no matter what, so the button
    // can never get permanently stuck in a loading state.
    const safetyTimer = setTimeout(() => {
      setIsGenerating(false);
      console.warn('[Sovereign] handleGenerate safety timeout fired — resetting isGenerating');
    }, 60_000);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === 'tr' ? 'Lütfen giriş yapın' : 'Please log in');
        return;
      }

      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
      if (!supabaseUrl) {
        toast.error('Configuration error: Supabase URL missing. Contact support.');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-proposal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Include both apikey and Authorization for maximum Edge Function compatibility
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            jobDescription,
            tone: isPaidPlan(currentPlan) ? selectedTone : undefined,
            userProfile: profile ? {
              skills: profile.skills,
              experience: profile.experience,
              hourly_rate: profile.hourly_rate,
            } : undefined,
            // Profession / specialty — injected into system prompt
            customProfession: customProfession.trim() || undefined,
            // Freelance-specific params
            userSegment,
            platformType: userSegment === 'freelancer' ? platformType : undefined,
            professionCluster: userSegment === 'freelancer' ? professionCluster : undefined,
            selectedProfession: userSegment === 'freelancer' ? selectedProfession : undefined,
            // Output language
            outputLanguage: outputLanguage !== 'en' ? outputLanguage : undefined,
            culturalTone: culturalTone !== 'neutral' ? culturalTone : undefined,
          }),
        }
      );

      let result: any;
      try {
        const text = await response.text();
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error('Response parse error:', parseErr, 'Status:', response.status);
        toast.error(language === 'tr' ? 'Sunucu geçersiz yanıt döndü. Tekrar deneyin.' : 'Server returned an invalid response. Please try again.');
        return;
      }
      
      if (!response.ok) {
        console.error('Proposal API error:', response.status, result);
        if (response.status === 429) {
          toast.error(language === 'tr' ? 'Hız limiti aşıldı. Bir süre bekleyip tekrar deneyin.' : 'Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          toast.error(language === 'tr' ? 'AI kredileri tükendi. Daha sonra tekrar deneyin.' : 'AI credits exhausted. Please try again later.');
        } else if (result.error?.includes('Daily limit')) {
          setUpgradeFeature('Unlimited Proposals');
          setShowUpgradeModal(true);
        } else {
          toast.error(result.error || (language === 'tr' ? 'Proposal üretilemedi. Tekrar deneyin.' : 'Failed to generate proposal. Please try again.'));
        }
        return;
      }

      if (!result.proposal) {
        console.error('No proposal in response:', result);
        toast.error(language === 'tr' ? 'Proposal üretilemedi. Tekrar deneyin.' : 'No proposal was generated. Please try again.');
        return;
      }

      setGeneratedProposal(result.proposal);
      // LocalStorage backup — user never loses content even if Supabase is down.
      try { localStorage.setItem('sovereign_last_proposal', result.proposal); } catch {}

      // For free users: track view count
      if (isFreePlan) {
        const newCount = incrementProposalViews();
        setProposalViewsUsed(newCount);
      }

      const nextCredits = typeof result.creditsRemaining === 'number'
        ? result.creditsRemaining
        : Math.max(0, (profile?.credits_balance ?? 0) - COST_PER_ACTION);

      if (result.variants && result.variants.length > 0) {
        setProposalVariants(result.variants);
        setActiveVariant(result.variants[0].id);
      }

      // Freelance score — map both legacy and competitive result
      if (result.freelanceScore) {
        setFreelanceScore(result.freelanceScore);
        if (result.freelanceScore.competitiveScore !== undefined) {
          setCompetitiveScoreResult({
            rawScore: result.freelanceScore.rawScore,
            competitiveScore: result.freelanceScore.competitiveScore,
            percentile: result.freelanceScore.percentile,
            interpretation: result.freelanceScore.interpretation,
            competitionLevel: result.freelanceScore.competitionLevel,
            contextLabel: result.freelanceScore.contextLabel,
            optimizedPotential: result.freelanceScore.optimizedPotential,
            competitiveAdjustment: result.freelanceScore.competitiveAdjustment,
            factors: result.freelanceScore.factors,
            suggestions: result.freelanceScore.topSuggestions || [],
          });
        }
      }
      
      if (profile) {
        const updatedProfile = {
          ...profile,
          credits_balance: nextCredits,
          daily_proposals_used: result.usage?.used ?? profile.daily_proposals_used,
        };

        if (result.usage && result.usage.used > 0 && result.usage.used % 10 === 0 && user) {
          const newBonus = (profile.bonus_credits || 0) + 5;
          await supabase.from('profiles').update({ bonus_credits: newBonus }).eq('user_id', user.id);
          updatedProfile.bonus_credits = newBonus;
          toast.success(language === 'tr' ? '🎁 Kilometre taşı! +5 bonus proposal kazandın!' : '🎁 Milestone! You\'ve earned +5 bonus proposals!', { duration: 5000 });
        }

        setProfile(updatedProfile);
      }
      
      toast.success(txt.proposalGenerated);
    } catch (err: any) {
      const rawMsg = err?.message || err?.toString() || 'Unknown error';
      console.error('[SOVEREIGN_ERR] Dashboard handleGenerate:', rawMsg, err);

      // ── Client-side OpenAI fallback ─────────────────────────────────────────
      // If the edge function is unreachable but VITE_OPENAI_API_KEY / BYOK is set,
      // generate the proposal directly on the client.
      try {
        const fallbackProposal = await generateProposalFallback(jobDescription, profile, customProfession || undefined);
        if (fallbackProposal) {
          setGeneratedProposal(fallbackProposal);
          try { localStorage.setItem('sovereign_last_proposal', fallbackProposal); } catch {}
          toast.success(
            language === 'tr'
              ? '✅ Teklif doğrudan bağlantıyla üretildi.'
              : '✅ Proposal generated via direct connection.',
          );
          return; // Fallback succeeded — skip the error display below.
        }
      } catch (fallbackErr: any) {
        console.error('[SOVEREIGN_ERR] Dashboard handleGenerate — client fallback also failed:', fallbackErr?.message ?? fallbackErr);
      }

      // Both paths failed — surface explicit diagnostic message to the user.
      const isNetworkError =
        err instanceof TypeError ||
        /fetch|network|CORS|failed to fetch/i.test(rawMsg);
      const msg = isNetworkError
        ? `Connection Timeout: Could not reach the AI service. Check your internet connection and try again. (${rawMsg})`
        : `Generation Failed: ${rawMsg}`;
      setGenerateError(msg);
      toast.error(msg);
    } finally {
      clearTimeout(safetyTimer);
      setIsGenerating(false);
    }
  };

  const getActiveProposalText = () => {
    if (proposalVariants && activeVariant) {
      const v = proposalVariants.find(v => v.id === activeVariant);
      return v?.text || generatedProposal;
    }
    return generatedProposal;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveProposalText());
    setCopied(true);
    toast.success(txt.copySuccess);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailExport = () => {
    const text = getActiveProposalText();
    if (!text) return;
    const subject = encodeURIComponent('My Application Proposal — Sovereign');
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    toast.success(txt.emailOpening);
  };

  const handleShareLink = async () => {
    if (!user || !generatedProposal) return;
    try {
      // Generate a unique token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      
      // Save proposal with share token
      const { error } = await supabase
        .from('proposals')
        .insert({
          user_id: user.id,
          job_description: jobDescription,
          generated_proposal: getActiveProposalText(),
          status: 'approved',
          share_token: token,
        });

      if (error) throw error;

      const shareUrl = `${window.location.origin}/p/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Failed to create share link');
    }
  };

  const handleSave = async () => {
    if (!canAccessFeature(currentPlan, 'canSaveHistory')) {
      setUpgradeFeature('Save Proposal History');
      setShowUpgradeModal(true);
      return;
    }

    if (!user || !generatedProposal) return;
    const textToSave = getActiveProposalText();

    try {
      await saveProposal(user.id, jobDescription, textToSave);
      toast.success(txt.saveSuccess);
      
      const proposals = await getRecentProposals(user.id, 5);
      setRecentProposals(proposals);
      
      setJobDescription('');
      setGeneratedProposal('');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save proposal');
    }
  };

  const handleExport = (proposalText?: string, jobDesc?: string) => {
    const textToExport = proposalText || getActiveProposalText();
    if (!textToExport) return;

    const downloadLimit = getDownloadLimit(currentPlan);
    if (downloadLimit !== Infinity && downloadsUsed >= downloadLimit) {
      setUpgradeFeature('Unlimited Downloads');
      setShowUpgradeModal(true);
      return;
    }

    const content = `PROPOSAL\n${'='.repeat(50)}\n\n${textToExport}\n\n${'='.repeat(50)}\nGenerated by Sovereign AI`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadsUsed(incrementDownloadsUsed());
    toast.success(txt.proposalDownloaded);
  };

  const handleExportPDF = () => {
    const textToExport = getActiveProposalText();
    if (!textToExport) return;
    const paid = isPaidPlan(currentPlan);
    const noWatermark = canDownloadWithoutWatermark(paid);
    if (!paid && noWatermark) incrementFreePremiumDownloads();
    exportProposalAsPDF(textToExport, 'proposal', {
      fullName: profile?.full_name || undefined,
      isPaid: noWatermark,
      type: 'proposal',
    });
    setDownloadsUsed(incrementDownloadsUsed());
    toast.success(language === 'tr' ? 'PDF indirildi!' : 'PDF downloaded!');
  };

  const handleExportDOCX = async () => {
    const textToExport = getActiveProposalText();
    if (!textToExport) return;
    const paid = isPaidPlan(currentPlan);
    const noWatermark = canDownloadWithoutWatermark(paid);
    if (!paid && noWatermark) incrementFreePremiumDownloads();
    await exportProposalAsDOCX(textToExport, 'proposal', {
      fullName: profile?.full_name || undefined,
      isPaid: noWatermark,
      type: 'proposal',
    });
    setDownloadsUsed(incrementDownloadsUsed());
    toast.success(language === 'tr' ? 'DOCX indirildi!' : 'DOCX downloaded!');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show segment selector if not chosen yet
  if (!userSegment) {
    return (
      <AppShell user={user ?? sessionUser} plan={currentPlan} creditsBalance={profile?.credits_balance ?? 0}>
        <div className="min-h-screen bg-background">
          <SegmentSelector onSelect={handleSegmentSelect} />
        </div>
      </AppShell>
    );
  }

  const getPlanLabel = () => {
    if (isSuperAdmin) return SUPERADMIN_PLAN_LABEL;
    if (contextPlanLabel && currentPlan === SUPERADMIN_PLAN_TYPE) return contextPlanLabel;
    switch (currentPlan) {
      case 'elite': return 'Elite';
      case 'pro': return 'Pro';
      case 'standard': return 'Standard';
      case SUPERADMIN_PLAN_TYPE:
      case 'enterprise': return 'Enterprise B2B';
      default: return t.pricing.basic.name;
    }
  };

  const isFreelancer = userSegment === 'freelancer';
  const creditsBalance = remainingCredits || profile?.credits_balance || 0;
  // SuperAdmin always sees 999999 from SessionContext; non-SA reads profile DB.
  const currentCredits = isSuperAdmin || isByokUnlimited || hasBYOKAccess
    ? remainingCredits
    : (profile?.remaining_credits ?? creditsBalance ?? 0);
  const maxCredits = isSuperAdmin ? 999999 : (profile?.monthly_credit_limit || 400);
  // Human-readable label for credit displays that should never show a raw number for SA.
  const creditDisplayLabel = isSuperAdmin || isByokUnlimited || hasBYOKAccess
    ? '∞ UNLIMITED'
    : currentCredits.toLocaleString();
  const percentage = maxCredits > 0
    ? Math.min(100, Math.max(0, Math.round((currentCredits / maxCredits) * 100)))
    : 0;
  const proposalUsageLabel = hasUnlimitedProposals ? dashboardUiText.unlimited : `${proposalsUsed}/${dailyLimit}`;
  const planLabel = getPlanLabel();
  const downloadLimit = getDownloadLimit(currentPlan);
  const downloadUsageLabel = downloadLimit === Infinity ? dashboardUiText.unlimited : `${downloadsUsed}/${downloadLimit}`;
  const proposalProgressValue = hasUnlimitedProposals ? 100 : Math.min(100, Math.round((proposalsUsed / Math.max(dailyLimit, 1)) * 100));
  const downloadProgressValue = downloadLimit === Infinity ? 100 : Math.min(100, Math.round((downloadsUsed / Math.max(downloadLimit, 1)) * 100));
  const membershipHint = isElitePlan(currentPlan)
    ? dashboardUiText.elitePlanHint
    : currentPlan === 'pro'
      ? dashboardUiText.proPlanHint
      : dashboardUiText.freePlanHint;
  const billingLabel = profile?.billing_period === 'monthly' ? dashboardUiText.monthlyPlan : dashboardUiText.monthlyBilling;
  const creditAlert = creditsBalance <= 0
    ? {
        title: dashboardUiText.creditEmptyTitle,
        description: dashboardUiText.creditEmptyDesc,
        className: 'border-destructive/30 bg-destructive/10',
      }
    : creditsBalance <= 300
      ? {
          title: dashboardUiText.creditLowTitle,
          description: dashboardUiText.creditLowDesc,
          className: 'border-primary/20 bg-primary/10',
        }
      : {
          title: dashboardUiText.creditHealthyTitle,
          description: dashboardUiText.creditHealthyDesc,
          className: 'border-border bg-background/40',
        };
  const quickActions = [
    {
      title: dashboardUiText.startGenerating,
      description: dashboardUiText.startGeneratingDesc,
      to: '#workspace',
      icon: Send,
      isAnchor: true,
    },
    {
      title: dashboardUiText.viewHistory,
      description: dashboardUiText.viewHistoryDesc,
      to: '/proposals',
      icon: FileText,
    },
    {
      title: dashboardUiText.editProfile,
      description: dashboardUiText.editProfileDesc,
      to: '/profile',
      icon: Settings,
    },
    {
      title: dashboardUiText.managePlan,
      description: dashboardUiText.managePlanDesc,
      to: '/pricing',
      icon: Zap,
    },
  ];

  return (
    <AppShell user={user ?? sessionUser} plan={currentPlan} creditsBalance={creditsBalance}>
    <div className="min-h-screen bg-background">

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">

        <section className="max-w-6xl mx-auto">
          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-accent/30 p-6 lg:p-8">
              <div className="hero-glow -top-40 right-[-12rem] opacity-60" />
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {dashboardUiText.availableNow}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {isFreelancer ? dashboardUiText.freelancerMode : dashboardUiText.corporateMode}
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {dashboardUiText.welcome}{profile?.full_name ? `, ${profile.full_name}` : ''}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {dashboardUiText.memberWorkspace}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{dashboardUiText.creditBalance}</p>
                    <p className={`mt-2 text-2xl font-bold ${isSuperAdmin || isByokUnlimited || hasBYOKAccess ? 'text-emerald-400' : 'text-foreground'}`}>
                      {creditDisplayLabel}
                    </p>
                    {!(isSuperAdmin || isByokUnlimited || hasBYOKAccess) && (
                      <>
                        <p className="mt-1 text-[11px] text-muted-foreground">{percentage}% of {maxCredits.toLocaleString()}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentCredits <= 0 ? 'bg-destructive' : percentage < 20 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{dashboardUiText.currentPlan}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{getPlanLabel()}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{dashboardUiText.proposalQuota}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{proposalUsageLabel}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#workspace">
                    <Button variant="gold" size="lg">
                      <Send className="w-4 h-4 mr-2" />
                      {dashboardUiText.startGenerating}
                    </Button>
                  </a>
                  <Link to="/pricing">
                    <Button variant="outline" size="lg">
                      <Zap className="w-4 h-4 mr-2" />
                      {dashboardUiText.buyCredits}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="overflow-hidden rounded-3xl border-border bg-card">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-foreground">{dashboardUiText.membershipTitle}</CardTitle>
                      <CardDescription className="mt-1">{dashboardUiText.membershipDesc}</CardDescription>
                    </div>
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                      <Crown className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default" className="gap-1 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                      <span>{dashboardUiText.statusActive}</span>
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
                      {planLabel}
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                      {billingLabel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border bg-background/60 p-3 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight truncate">{dashboardUiText.proposalsRemaining}</p>
                      <p className="mt-1.5 text-lg font-bold text-foreground truncate">{hasUnlimitedProposals ? '∞' : Math.max(0, dailyLimit - proposalsUsed + bonusCredits)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/60 p-3 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight truncate">{dashboardUiText.downloadsRemaining}</p>
                      <p className="mt-1.5 text-lg font-bold text-foreground truncate">{downloadLimit === Infinity ? '∞' : Math.max(0, downloadLimit - downloadsUsed)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/60 p-3 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight truncate">{dashboardUiText.creditsReady}</p>
                      <div className={`mt-1.5 flex items-center gap-1.5 ${isSuperAdmin || isByokUnlimited || hasBYOKAccess ? 'text-emerald-400' : 'text-foreground'}`}>
                        <Coins className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="text-lg font-bold">{creditDisplayLabel}</span>
                      </div>
                      {!(isSuperAdmin || isByokUnlimited || hasBYOKAccess) && (
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${currentCredits <= 0 ? 'bg-destructive' : percentage < 20 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {!(isByokUnlimited || hasBYOKAccess) && (
                  <div className={`rounded-2xl border p-4 ${creditAlert.className}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{creditAlert.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{creditAlert.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{dashboardUiText.paymentProvider}</p>
                      </div>
                      <Link to="/pricing">
                        <Button variant="gold" size="sm">
                          <Zap className="mr-2 h-4 w-4" />
                          {dashboardUiText.topUpNow}
                        </Button>
                      </Link>
                    </div>
                  </div>
                  )}

                  <div className="rounded-2xl border border-border bg-background/40 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{dashboardUiText.usageToday}</p>
                      <span className="text-xs text-muted-foreground">{proposalUsageLabel} · {downloadUsageLabel}</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{dashboardUiText.proposalQuota}</span>
                          <span>{proposalUsageLabel}</span>
                        </div>
                        <Progress value={proposalProgressValue} className="h-2.5" />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{dashboardUiText.downloadsRemaining}</span>
                          <span>{downloadUsageLabel}</span>
                        </div>
                        <Progress value={downloadProgressValue} className="h-2.5" />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{dashboardUiText.creditBalance}</span>
                          <span className={isSuperAdmin || isByokUnlimited || hasBYOKAccess ? 'text-emerald-400 font-semibold' : ''}>
                            {creditDisplayLabel}
                            {!(isSuperAdmin || isByokUnlimited || hasBYOKAccess) && ` / ${maxCredits.toLocaleString()}`}
                          </span>
                        </div>
                        {!(isSuperAdmin || isByokUnlimited || hasBYOKAccess) && (
                          <Progress value={percentage} className="h-2.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <p className="text-sm font-medium text-foreground">{membershipHint}</p>
                    {!isElitePlan(currentPlan) && (
                      <div className="mt-3">
                        <Link to="/pricing">
                          <Button variant="gold" size="sm">
                            <Zap className="mr-2 h-4 w-4" />
                            {dashboardUiText.upgradeNow}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{dashboardUiText.quickActions}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{dashboardUiText.quickActionsDesc}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    if (action.isAnchor) {
                      return (
                        <a
                          key={action.title}
                          href={action.to}
                          className="group rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-accent/40"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{action.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                          </div>
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={action.title}
                        to={action.to}
                        className="group rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-accent/40"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-primary/10 p-2 text-primary">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{action.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{dashboardUiText.activeMode}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-foreground">
                      {isFreelancer ? dashboardUiText.freelancerMode : dashboardUiText.corporateMode}
                    </p>
                    <button
                      onClick={() => setUserSegment(null)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {dashboardUiText.desktopReady}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto">
          <CreditActivityPanel currentBalance={currentCredits} monthlyLimit={maxCredits} items={creditActivity} />
        </section>

        {/* Bonus Credits & Referral Banner */}
        {user && profile && isFreePlan && (
          <div className="max-w-5xl mx-auto mb-6">
            <BonusCreditsBanner
              userId={user.id}
              bonusCredits={bonusCredits}
              dailyUsed={proposalsUsed}
              onCreditsUpdate={async () => {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', user.id)
                  .maybeSingle();
                if (profileData) setProfile(profileData);
                const { data: creditData } = await supabase
                  .from('credit_transactions')
                  .select('id, amount, balance_after, created_at, transaction_type, description, reference_type')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false })
                  .limit(CREDIT_ACTIVITY_LIMIT);
                if (creditData) setCreditActivity(creditData as CreditActivityItem[]);
              }}
            />
          </div>
        )}

        {/* Page Title + CV Optimize Button */}
        <div id="workspace" className="text-center mb-6 scroll-mt-24">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            {isFreelancer ? txt.freelanceTitle : txt.analyzeTitle}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!hasActionCredits(profile?.credits_balance ?? 0)) {
                setShowCreditsModal(true);
                return;
              }
              setShowCVOptimizer(true);
            }}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            {txt.optimizeCV}
          </Button>
        </div>

        {/* Free Plan Upgrade Teaser */}
        {isFreePlan && (
          <div className="max-w-5xl mx-auto mb-6">
            <div className="relative rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {txt.upgradeProMsg}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {`${proposalsUsed}/${dailyLimit} ${txt.usedToday}`}
                  </p>
                </div>
              </div>
              <Button variant="gold" size="sm" onClick={() => { setShowUpgradeModal(true); setUpgradeFeature('Pro Plan'); }}>
                {txt.upgradeBtn}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Left: Input */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              {/* Freelance-specific inputs */}
              {isFreelancer && (
                <div className="mb-4 pb-4 border-b border-border">
                  <FreelanceInputs
                    platformType={platformType}
                    professionCluster={professionCluster}
                    selectedProfession={selectedProfession}
                    onPlatformChange={(v) => { setPlatformType(v); if (user) supabase.from('profiles').update({ platform_type: v }).eq('user_id', user.id); }}
                    onClusterChange={(v) => { setProfessionCluster(v); if (user) supabase.from('profiles').update({ profession_cluster: v }).eq('user_id', user.id); }}
                    onProfessionChange={setSelectedProfession}
                  />
                </div>
              )}

              {/* ── Profession / Specialty Input ───────────────────────── */}
              <div className="mb-4 pb-4 border-b border-border">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3" />
                  Your Profession / Specialty
                  <span className="ml-1 text-[10px] text-muted-foreground/60">(AI adapts tone & terminology)</span>
                </label>
                <input
                  type="text"
                  value={customProfession}
                  onChange={(e) => setCustomProfession(e.target.value)}
                  placeholder='e.g. Full-stack Developer, Gastronomy Specialist, B2B Sales Consultant…'
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                {/* Quick-select suggestion chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    'Full-stack Developer', 'UI/UX Designer', 'Copywriter', 'SEO Specialist',
                    'Digital Marketer', 'Data Analyst', 'Video Editor', 'Chef / Gastronomy',
                    'B2B Sales Consultant', 'Graphic Designer', 'Product Manager', 'DevOps Engineer',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCustomProfession(chip)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        customProfession === chip
                          ? 'border-primary/60 bg-primary/15 text-primary'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <label className="text-sm font-medium text-foreground mb-3 flex items-center justify-between">
                <span>{isFreelancer ? txt.clientBrief : txt.inputLabel}</span>
                {isPaidPlan(currentPlan) && (
                  <button
                    onClick={handleAutoFill}
                    disabled={isAutoFilling || !jobDescription.trim()}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                      autoFillApplied
                        ? 'bg-green-500/20 text-green-500'
                        : isAutoFilling
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {isAutoFilling ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> {txt.autoFilling}</>
                    ) : autoFillApplied ? (
                      <><Check className="w-3 h-3" /> {txt.autoFilled}</>
                    ) : (
                      <><Wand2 className="w-3 h-3" /> {txt.autoFill}</>
                    )}
                  </button>
                )}
                {!isPaidPlan(currentPlan) && (
                  <button
                    onClick={() => { setUpgradeFeature('AI Auto-Fill'); setShowUpgradeModal(true); }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Lock className="w-3 h-3" />
                    <Wand2 className="w-3 h-3" />
                    {txt.autoFill}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Pro</span>
                  </button>
                )}
              </label>
              <Textarea
                placeholder={isFreelancer ? txt.clientBriefPlaceholder : txt.inputPlaceholder}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  setAutoGenerateTriggered(false);
                }}
                onPaste={(e) => {
                  // Elite: auto-trigger auto-fill after paste
                  if (isElitePlan(currentPlan)) {
                    setTimeout(() => {
                      handleAutoFill();
                    }, 300);
                  }
                }}
                className="min-h-[250px] resize-none text-sm"
              />

              {/* Output Language Selector */}
              <div className="mt-3">
                <OutputLanguageSelector
                  plan={currentPlan}
                  selectedLanguage={outputLanguage}
                  culturalTone={culturalTone}
                  onLanguageChange={setOutputLanguage}
                  onCulturalToneChange={setCulturalTone}
                />
              </div>

              {/* Tone Selector - Pro/Elite only */}
              {isPaidPlan(currentPlan) && (
                <ToneSelector
                  selectedTone={selectedTone}
                  onToneChange={setSelectedTone}
                  hasProposal={!!generatedProposal}
                />
              )}
              <Button
                variant="gold"
                className="w-full mt-4"
                onClick={handleGenerate}
                disabled={isGenerating || (!hasUnlimitedProposals && typeof proposalsLeft === 'number' && proposalsLeft <= 0)}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {txt.analyzing}
                  </>
                ) : !hasUnlimitedProposals && typeof proposalsLeft === 'number' && proposalsLeft <= 0 ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {txt.limitReached}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {isFreelancer ? txt.generateProposal : txt.analyzeButton}
                  </>
                )}
              </Button>

              {/* Retry banner — shown after a failed generation attempt */}
              {generateError && !isGenerating && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="flex-1 text-red-300">{generateError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="gap-1.5 border-red-500/40 text-red-300 hover:bg-red-500/10 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">{txt.resultTitle}</h2>
                {generatedProposal && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleEmailExport} title="Email">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                )}
              </div>

              {generatedProposal ? (
                <div className="flex-1 flex flex-col">
                  {/* Multi-variant tabs for Pro/Elite */}
                  {proposalVariants && proposalVariants.length > 1 ? (
                    <Tabs value={activeVariant} onValueChange={setActiveVariant} className="flex-1 flex flex-col">
                      <TabsList className="w-full flex-wrap h-auto gap-1 mb-3">
                        {proposalVariants.map((v) => (
                          <TabsTrigger key={v.id} value={v.id} className="text-xs px-3 py-1.5 flex items-center gap-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${v.id === 'technical' ? 'bg-blue-400' : v.id === 'persuasive' ? 'bg-green-400' : v.id === 'standout' ? 'bg-purple-400' : 'bg-amber-400'}`} />
                            <span>{v.badge}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {proposalVariants.map((v) => {
                        const labelColors: Record<string, string> = {
                          technical: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                          persuasive: 'bg-green-500/10 text-green-400 border border-green-500/20',
                          standout: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                          strategic: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        };
                        return (
                          <TabsContent key={v.id} value={v.id} className="flex-1 flex flex-col mt-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${labelColors[v.id] || 'bg-muted text-muted-foreground'}`}>
                                {v.label}
                              </span>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                                const subject = encodeURIComponent(`${v.label} — Sovereign`);
                                const body = encodeURIComponent(v.text);
                                window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
                                toast.success(txt.emailOpening);
                              }}>
                                <Mail className="w-3 h-3" />
                                Email
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 italic">{v.description}</p>
                            <div className="flex-1 whitespace-pre-wrap text-foreground leading-relaxed text-sm overflow-y-auto max-h-[240px] mb-4">
                              {v.text}
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  ) : (
                    <>
                      {/* Free view limit badge */}
                      {isFreePlan && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">
                            {proposalViewsUsed >= FREE_VIEW_LIMIT
                              ? txt.freeViewsUsed
                              : `📄 ${txt.freeViews}: ${proposalViewsUsed}/${FREE_VIEW_LIMIT}`}
                          </span>
                          {proposalViewsUsed >= FREE_VIEW_LIMIT && (
                            <button
                              onClick={() => { setShowUpgradeModal(true); setUpgradeFeature('Unlimited Proposal Views'); }}
                              className="text-xs text-primary underline underline-offset-2"
                            >
                              {txt.upgradeUnlimited}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Proposal output */}
                      {isFreePlan && proposalViewsUsed > FREE_VIEW_LIMIT ? (
                        <div className="relative flex-1 overflow-hidden mb-4 rounded-lg">
                          <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm max-h-[200px] overflow-hidden blur-sm select-none pointer-events-none" aria-hidden="true">
                            {generatedProposal}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/80 to-card" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-card border border-border rounded-xl px-6 py-5 text-center shadow-xl max-w-xs mx-4">
                              <div className="text-2xl mb-2">🔒</div>
                              <p className="text-sm font-semibold text-foreground mb-1">
                                {txt.dailyFreeViewsUsed}
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {txt.dailyFreeViewsMsg}
                              </p>
                              <button
                                onClick={() => { setShowUpgradeModal(true); setUpgradeFeature('Unlimited Proposals'); }}
                                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                              >
                                {txt.unlockUnlimited}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 whitespace-pre-wrap text-foreground leading-relaxed text-sm overflow-y-auto max-h-[280px] mb-4">
                          {generatedProposal}
                        </div>
                      )}
                    </>
                  )}
                  <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                    <Button variant="gold" className="flex-1" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-2" />
                      {txt.save}
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} title="PDF">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button variant="outline" onClick={handleExportDOCX} title="DOCX">
                      <Download className="w-4 h-4 mr-1" />
                      DOCX
                    </Button>
                    <Button variant="outline" onClick={() => handleExport()} title="TXT">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={handleEmailExport}>
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={handleShareLink} title="Share link">
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Follow-up Kit */}
                  {isPaidPlan(currentPlan) && (
                    <FollowUpKit
                      proposal={getActiveProposalText()}
                      jobDescription={jobDescription}
                      plan={currentPlan}
                    />
                  )}

                  {/* Upgrade Banner */}
                  {currentPlan !== 'elite' && currentPlan !== SUPERADMIN_PLAN_TYPE && !isSuperAdmin && (
                    <div className="mt-4">
                      <UpgradeBanner currentPlan={currentPlan} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{txt.emptyResult}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Freelance Score Display */}
            {freelanceScore && isFreelancer && (
              <FreelanceScoreDisplay
                score={freelanceScore}
                competitiveScore={competitiveScoreResult}
                plan={currentPlan}
                onUpgrade={() => { setShowUpgradeModal(true); setUpgradeFeature('Full Score Analysis'); }}
              />
            )}

            {/* Interview Prep */}
            {generatedProposal && isPaidPlan(currentPlan) && (
              <InterviewPrep
                jobDescription={jobDescription}
                proposal={getActiveProposalText()}
                plan={currentPlan}
                userProfile={profile ? { skills: profile.skills, experience: profile.experience } : undefined}
              />
            )}
          </div>
        </div>

        {/* Elite Analytics Panel */}
        {generatedProposal && isElitePlan(currentPlan) && (
          <div className="max-w-5xl mx-auto mt-8">
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-foreground">
                  {txt.eliteAnalytics}
                </h2>
              </div>
              <EliteAnalytics />
            </div>

            {/* Elite: Company Apply Link */}
            {(() => {
              const jd = jobDescription.toLowerCase();
              let applyUrl = '';
              let platform = '';
              let platformLabel = '';
              let platformColor = '';

              if (jd.includes('upwork.com') || jd.includes('upwork')) {
                const upworkMatch = jobDescription.match(/https?:\/\/[^\s]*upwork\.com\/[^\s]*/i);
                applyUrl = upworkMatch ? upworkMatch[0] : 'https://www.upwork.com/nx/find-work/';
                platform = 'Upwork';
                platformLabel = txt.applyUpwork;
                platformColor = 'border-green-500/30 bg-green-500/5 text-green-500 hover:bg-green-500/10';
              } else if (jd.includes('linkedin.com') || jd.includes('linkedin')) {
                const liMatch = jobDescription.match(/https?:\/\/[^\s]*linkedin\.com\/[^\s]*/i);
                applyUrl = liMatch ? liMatch[0] : 'https://www.linkedin.com/jobs/';
                platform = 'LinkedIn';
                platformLabel = txt.applyLinkedIn;
                platformColor = 'border-blue-500/30 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10';
              } else if (jd.includes('fiverr')) {
                applyUrl = 'https://www.fiverr.com/';
                platform = 'Fiverr';
                platformLabel = txt.respondFiverr;
                platformColor = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10';
              } else {
                const companyPatterns = [
                  /at\s+([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)?)/,
                  /company:\s*([A-Za-z0-9\s]+)/i,
                  /([A-Z][a-zA-Z0-9]+)\s+is\s+(?:looking|hiring|seeking)/,
                ];
                let companyName = '';
                for (const pattern of companyPatterns) {
                  const match = jobDescription.match(pattern);
                  if (match) { companyName = match[1].trim(); break; }
                }
                if (companyName) {
                  applyUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' careers jobs apply')}`;
                  platform = companyName;
                  platformLabel = `${txt.findCareers} — ${companyName}`;
                  platformColor = 'border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10';
                }
              }

              if (!applyUrl) return null;

              return (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-foreground">
                      {txt.eliteDirectApply}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {txt.proposalReady}
                  </p>
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${platformColor}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {platformLabel}
                    <span className="text-xs opacity-70">— {platform}</span>
                  </a>
                </div>
              );
            })()}
          </div>
        )}

        {/* Smart Match & Apply - Pro/Elite */}
        {jobDescription.trim().length >= 20 && (
          <div className="max-w-5xl mx-auto mt-8">
            <SmartMatchPanel
              jobDescription={jobDescription}
              plan={currentPlan}
              outputLanguage={outputLanguage}
              onUpgrade={() => { setShowUpgradeModal(true); setUpgradeFeature('Smart Match'); }}
            />
          </div>
        )}

        {/* Job Recommendations - Pro/Elite */}
        {generatedProposal && isPaidPlan(currentPlan) && (
          <div className="max-w-5xl mx-auto mt-8">
            <JobRecommendations
              proposal={getActiveProposalText()}
              jobDescription={jobDescription}
              plan={currentPlan}
              userSegment={userSegment}
              platformType={platformType}
              professionCluster={professionCluster}
            />
          </div>
        )}

        {/* Detailed Analysis Report - Pro/Elite */}
        {generatedProposal && isPaidPlan(currentPlan) && (
          <div className="max-w-5xl mx-auto mt-8">
            <DetailedAnalysisReport
              plan={currentPlan}
              isElite={isElitePlan(currentPlan)}
            />
          </div>
        )}

        {/* Optimization Tools */}
        {generatedProposal && (
          <div className="max-w-5xl mx-auto mt-8">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">
                    {txt.optimizationTools}
                  </h2>
                </div>
                {isFreePlan && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-primary border-primary/30"
                  >
                    {txt.upgradeHint}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
              <FeaturePanel 
                currentPlan={currentPlan} 
                generatedProposal={generatedProposal}
                jobDescription={jobDescription}
                onProposalUpdate={setGeneratedProposal}
              />
            </div>
          </div>
        )}

        {/* Career Roadmap - Pro/Elite only */}
        {isPaidPlan(currentPlan) && user && profile && (
          <div className="max-w-5xl mx-auto mt-8">
            <CareerRoadmap
              userId={user.id}
              profile={profile}
              onRoadmapGenerated={async () => {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', user.id)
                  .maybeSingle();
                if (profileData) setProfile(profileData);
              }}
            />
          </div>
        )}

        {/* Review Form */}
        {generatedProposal && user && (
          <div className="max-w-5xl mx-auto mt-8">
            <ReviewForm userId={user.id} userName={profile?.full_name} />
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      <FeatureUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentPlan={currentPlan}
        featureName={upgradeFeature}
      />

      <InsufficientCreditsModal
        open={showCreditsModal}
        onOpenChange={setShowCreditsModal}
        balance={profile?.credits_balance ?? 0}
        actionLabel="This AI action"
      />

      {/* CV Optimizer Modal */}
      <CVOptimizerModal
        open={showCVOptimizer}
        onOpenChange={setShowCVOptimizer}
        userPlan={currentPlan}
        creditsBalance={profile?.credits_balance ?? 0}
        onCreditsConsumed={(remaining) => {
          if (profile) {
            setProfile({
              ...profile,
              credits_balance: typeof remaining === 'number'
                ? remaining
                : Math.max(0, (profile.credits_balance ?? 0) - COST_PER_ACTION),
            });
          }
        }}
      />

      {/* ATS Gap Analyzer — B2C single-CV tool */}
      <div className="max-w-5xl mx-auto mt-8">
        {!showATSAnalyzer ? (
          <button
            onClick={() => setShowATSAnalyzer(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">ATS Gap Analyzer & 1-Click CV Fix</p>
                <p className="text-xs text-muted-foreground">Compare your resume vs any JD — get score, gap analysis, and AI-rewritten bullets</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ) : (
          <ATSAnalyzer
            prefillJD={jobDescription}
            plan={currentPlan}
            onUpgrade={() => { setShowUpgradeModal(true); setUpgradeFeature('ATS AI Analysis'); }}
          />
        )}
      </div>

      {/* Support Chatbot */}

      {/* Mobile Nav */}
      {/* MobileBottomNav handled by AppShell */}
    </div>
    </AppShell>
  );
};

export default Dashboard;
