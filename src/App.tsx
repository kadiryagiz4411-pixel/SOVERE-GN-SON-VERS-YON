import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SplashScreen from "@/components/SplashScreen";
import PageTransition from "@/components/PageTransition";
import { InstallPromptFAB } from "@/components/InstallPromptFAB";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import ProfileSettings from "./pages/ProfileSettings";
import ProposalsHistory from "./pages/ProposalsHistory";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import EliteActivated from "./pages/EliteActivated";
import Admin from "./pages/Admin";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { GetHiredAtPage, HowToGetJobPage, ResumeForPage, ATSCheckerPage, BestResumePage } from "./pages/seo/SEOPages";
import { UpworkProposalPage, FiverrProposalPage, BestProposalPage } from "./pages/seo/FreelanceSEOPages";
import { ProposalLanguagePage, ResumeLanguagePage, ProposalTemplatePage } from "./pages/seo/LanguageSEOPages";
import { AcceptanceRatePage } from "./pages/seo/AcceptanceRatePage";
import AcceptanceScorePage from "./pages/AcceptanceScore";
import ProposalView from "./pages/ProposalView";
import Reviews from "./pages/Reviews";
import CVBuilder from "./pages/CVBuilder";
import ApplicationPipeline from "./pages/ApplicationPipeline";
import ApplyQueue from "./pages/ApplyQueue";
import Organization from "./pages/Organization";
import B2BDashboard from "./pages/B2BDashboard";
import TalentPool from "./pages/TalentPool";
import Billing from "./pages/Billing";

// Capture ?ref=CODE affiliate links on first visit and persist to localStorage
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

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>


        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/onboarding" element={<ProtectedRoute><PageTransition><Onboarding /></PageTransition></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><ProfileSettings /></PageTransition></ProtectedRoute>} />
        <Route path="/proposals" element={<ProtectedRoute><PageTransition><ProposalsHistory /></PageTransition></ProtectedRoute>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/upgrade-success" element={<PageTransition><UpgradeSuccess /></PageTransition>} />
        <Route path="/elite-activated" element={<PageTransition><EliteActivated /></PageTransition>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        <Route path="/reviews" element={<PageTransition><Reviews /></PageTransition>} />
        <Route path="/cv-builder" element={<ProtectedRoute><PageTransition><CVBuilder /></PageTransition></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PageTransition><ApplicationPipeline /></PageTransition></ProtectedRoute>} />
        <Route path="/apply-queue" element={<ProtectedRoute><PageTransition><ApplyQueue /></PageTransition></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute><PageTransition><Organization /></PageTransition></ProtectedRoute>} />
        <Route path="/b2b" element={<ProtectedRoute><B2BDashboard /></ProtectedRoute>} />
        <Route path="/b2b/talent-pool" element={<ProtectedRoute><TalentPool /></ProtectedRoute>} />
        <Route path="/settings/billing" element={<ProtectedRoute><PageTransition><Billing /></PageTransition></ProtectedRoute>} />
        {/* Programmatic SEO Routes */}
        <Route path="/get-hired-at/:company" element={<PageTransition><GetHiredAtPage /></PageTransition>} />
        <Route path="/how-to-get-job-at/:company" element={<PageTransition><HowToGetJobPage /></PageTransition>} />
        <Route path="/resume-for/:company/:role" element={<PageTransition><ResumeForPage /></PageTransition>} />
        <Route path="/ats-resume-checker/:role" element={<PageTransition><ATSCheckerPage /></PageTransition>} />
        <Route path="/best-resume-for/:role" element={<PageTransition><BestResumePage /></PageTransition>} />
        {/* Freelance SEO Routes */}
        <Route path="/upwork-proposal/:profession" element={<PageTransition><UpworkProposalPage /></PageTransition>} />
        <Route path="/fiverr-proposal/:profession" element={<PageTransition><FiverrProposalPage /></PageTransition>} />
        <Route path="/best-proposal/:profession" element={<PageTransition><BestProposalPage /></PageTransition>} />
        {/* Acceptance Rate Routes */}
        <Route path="/acceptance-rate/:company/:role" element={<PageTransition><AcceptanceRatePage /></PageTransition>} />
        {/* Email Funnel */}
        <Route path="/acceptance-score" element={<PageTransition><AcceptanceScorePage /></PageTransition>} />
        <Route path="/p/:token" element={<PageTransition><ProposalView /></PageTransition>} />
        {/* Language SEO Routes */}
        <Route path="/proposal/:profession/:language" element={<PageTransition><ProposalLanguagePage /></PageTransition>} />
        <Route path="/resume/:role/:language" element={<PageTransition><ResumeLanguagePage /></PageTransition>} />
        <Route path="/proposal-template/:profession/:language" element={<PageTransition><ProposalTemplatePage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>


  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash in standalone/PWA mode on cold start
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (!isStandalone) return false;
    // Show once per session
    const shown = sessionStorage.getItem("splash_shown");
    if (shown) return false;
    return true;
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("splash_shown", "1");
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AffiliateTracker />
          <InstallPromptFAB />
          <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
