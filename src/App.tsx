import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DevSandbox } from "@/components/dev/DevSandbox";
import SplashScreen from "@/components/SplashScreen";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ProposalsHistory = lazy(() => import("./pages/ProposalsHistory"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const UpgradeSuccess = lazy(() => import("./pages/UpgradeSuccess"));
const EliteActivated = lazy(() => import("./pages/EliteActivated"));
const Admin = lazy(() => import("./pages/Admin"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AcceptanceScorePage = lazy(() => import("./pages/AcceptanceScore"));
const ProposalView = lazy(() => import("./pages/ProposalView"));
const Reviews = lazy(() => import("./pages/Reviews"));
const CVBuilder = lazy(() => import("./pages/CVBuilder"));
const ApplicationPipeline = lazy(() => import("./pages/ApplicationPipeline"));
const ApplyQueue = lazy(() => import("./pages/ApplyQueue"));
const Organization = lazy(() => import("./pages/Organization"));
const B2BDashboard = lazy(() => import("./pages/B2BDashboard"));
const TalentPool = lazy(() => import("./pages/TalentPool"));
const Billing = lazy(() => import("./pages/Billing"));
const Redeem = lazy(() => import("./pages/Redeem"));
const InterviewSimulator = lazy(() => import("./pages/InterviewSimulator"));
const PortfolioBuilder = lazy(() => import("./pages/PortfolioBuilder"));
const CVAnalyzer = lazy(() => import("./pages/CVAnalyzer"));
const BatchUpload = lazy(() => import("./pages/BatchUpload"));
const TeamWorkspace = lazy(() => import("./pages/TeamWorkspace"));
const TalentPoolHub = lazy(() => import("./pages/TalentPoolHub"));
const BatchProposal = lazy(() => import("./pages/BatchProposal"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const ApplicationsCRM = lazy(() => import("./pages/ApplicationsCRM"));

const GetHiredAtPage = lazy(() => import("./pages/seo/SEOPages").then(m => ({ default: m.GetHiredAtPage })));
const HowToGetJobPage = lazy(() => import("./pages/seo/SEOPages").then(m => ({ default: m.HowToGetJobPage })));
const ResumeForPage = lazy(() => import("./pages/seo/SEOPages").then(m => ({ default: m.ResumeForPage })));
const ATSCheckerPage = lazy(() => import("./pages/seo/SEOPages").then(m => ({ default: m.ATSCheckerPage })));
const BestResumePage = lazy(() => import("./pages/seo/SEOPages").then(m => ({ default: m.BestResumePage })));
const UpworkProposalPage = lazy(() => import("./pages/seo/FreelanceSEOPages").then(m => ({ default: m.UpworkProposalPage })));
const FiverrProposalPage = lazy(() => import("./pages/seo/FreelanceSEOPages").then(m => ({ default: m.FiverrProposalPage })));
const BestProposalPage = lazy(() => import("./pages/seo/FreelanceSEOPages").then(m => ({ default: m.BestProposalPage })));
const ProposalLanguagePage = lazy(() => import("./pages/seo/LanguageSEOPages").then(m => ({ default: m.ProposalLanguagePage })));
const ResumeLanguagePage = lazy(() => import("./pages/seo/LanguageSEOPages").then(m => ({ default: m.ResumeLanguagePage })));
const ProposalTemplatePage = lazy(() => import("./pages/seo/LanguageSEOPages").then(m => ({ default: m.ProposalTemplatePage })));
const AcceptanceRatePage = lazy(() => import("./pages/seo/AcceptanceRatePage").then(m => ({ default: m.AcceptanceRatePage })));

const AffiliateTracker = () => {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && ref.trim() && !localStorage.getItem('affiliate_ref')) {
      localStorage.setItem('affiliate_ref', ref.trim().toUpperCase());
    }
  }, [searchParams]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[40vh] bg-background flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
      <Route path="/proposals" element={<ProtectedRoute><ProposalsHistory /></ProtectedRoute>} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/features" element={<Features />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/upgrade-success" element={<UpgradeSuccess />} />
      <Route path="/elite-activated" element={<EliteActivated />} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/install" element={<Install />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/cv-builder" element={<ProtectedRoute><CVBuilder /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><ApplicationPipeline /></ProtectedRoute>} />
      <Route path="/apply-queue" element={<ProtectedRoute><ApplyQueue /></ProtectedRoute>} />
      <Route path="/organization" element={<ProtectedRoute><Organization /></ProtectedRoute>} />
      <Route path="/b2b" element={<ProtectedRoute><B2BDashboard /></ProtectedRoute>} />
      <Route path="/b2b/talent-pool" element={<ProtectedRoute><TalentPool /></ProtectedRoute>} />
      <Route path="/interview-simulator" element={<ProtectedRoute><InterviewSimulator /></ProtectedRoute>} />
      <Route path="/portfolio-builder" element={<ProtectedRoute><PortfolioBuilder /></ProtectedRoute>} />
      <Route path="/cv-analyzer" element={<ProtectedRoute><CVAnalyzer /></ProtectedRoute>} />
      <Route path="/batch-upload" element={<ProtectedRoute><BatchUpload /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamWorkspace /></ProtectedRoute>} />
      <Route path="/talent-pool" element={<ProtectedRoute><TalentPoolHub /></ProtectedRoute>} />
      <Route path="/batch-proposal" element={<ProtectedRoute><BatchProposal /></ProtectedRoute>} />
      <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><ApplicationsCRM /></ProtectedRoute>} />
      <Route path="/settings/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/redeem" element={<Redeem />} />
      <Route path="/get-hired-at/:company" element={<GetHiredAtPage />} />
      <Route path="/how-to-get-job-at/:company" element={<HowToGetJobPage />} />
      <Route path="/resume-for/:company/:role" element={<ResumeForPage />} />
      <Route path="/ats-resume-checker/:role" element={<ATSCheckerPage />} />
      <Route path="/best-resume-for/:role" element={<BestResumePage />} />
      <Route path="/upwork-proposal/:profession" element={<UpworkProposalPage />} />
      <Route path="/fiverr-proposal/:profession" element={<FiverrProposalPage />} />
      <Route path="/best-proposal/:profession" element={<BestProposalPage />} />
      <Route path="/acceptance-rate/:company/:role" element={<AcceptanceRatePage />} />
      <Route path="/acceptance-score" element={<AcceptanceScorePage />} />
      <Route path="/p/:token" element={<ProposalView />} />
      <Route path="/proposal/:profession/:language" element={<ProposalLanguagePage />} />
      <Route path="/resume/:role/:language" element={<ResumeLanguagePage />} />
      <Route path="/proposal-template/:profession/:language" element={<ProposalTemplatePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (!isStandalone) return false;
    return !sessionStorage.getItem("splash_shown");
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <SessionProvider>
            <PlanProvider>
              <TooltipProvider>
                <Sonner />
                <BrowserRouter>
                  <ErrorBoundary>
                    <AffiliateTracker />
                    <AppRoutes />
                    <DevSandbox />
                  </ErrorBoundary>
                </BrowserRouter>
              </TooltipProvider>
            </PlanProvider>
          </SessionProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
