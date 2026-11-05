import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValueBarSection } from '@/components/landing/ValueBarSection';
import { StatsCounterSection } from '@/components/landing/StatsCounterSection';
import { BeforeAfterSection } from '@/components/landing/BeforeAfterSection';
import { AcceptancePredictorSection } from '@/components/landing/AcceptancePredictorSection';
import { FitScorePanicTester } from '@/components/growth/FitScorePanicTester';
import { TrustStripSection } from '@/components/landing/TrustStripSection';
import { LiveDemoSection } from '@/components/landing/LiveDemoSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CVOptimizerSection } from '@/components/landing/CVOptimizerSection';
import { PlanShowcaseSection } from '@/components/landing/PlanShowcaseSection';
import { ReviewsSection } from '@/components/landing/ReviewsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { ExtensionDownloadSection } from '@/components/landing/ExtensionDownloadSection';
import { FreelancePlatformSection } from '@/components/landing/FreelancePlatformSection';
import { AnimatedSection } from '@/components/landing/AnimatedSection';
import { useSession } from '@/contexts/SessionContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Do NOT wait for sessionReady — landing page renders immediately.
  // The redirect to /dashboard fires once session resolves.
  const { user, sessionReady } = useSession();

  useEffect(() => {
    // Redirect paid-traffic ads to the signup page with UTM params preserved.
    const hasAdParams =
      searchParams.get('utm_source') ||
      searchParams.get('gclid') ||
      searchParams.get('fbclid') ||
      searchParams.get('utm_campaign');
    if (hasAdParams) {
      const params = new URLSearchParams();
      params.set('mode', 'signup');
      searchParams.forEach((v, k) => params.set(k, v));
      navigate(`/auth?${params.toString()}`, { replace: true });
      return;
    }

    // Redirect authenticated users to their dashboard once session is ready.
    if (sessionReady && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate, sessionReady, user]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#09090b]">
        <Header />
        <main>
          <ErrorBoundary fallback={<div className="min-h-[40vh]" />}>
            <HeroSection />
          </ErrorBoundary>
          <AnimatedSection>
            <ValueBarSection />
          </AnimatedSection>
          <ErrorBoundary fallback={<div className="py-16" />}>
            <StatsCounterSection />
          </ErrorBoundary>
          <AnimatedSection>
            <AcceptancePredictorSection />
          </AnimatedSection>
          <AnimatedSection>
            <section className="container mx-auto px-4 py-16">
              <FitScorePanicTester variant="landing" />
            </section>
          </AnimatedSection>
          <AnimatedSection>
            <TrustStripSection />
          </AnimatedSection>
          <AnimatedSection>
            <BeforeAfterSection />
          </AnimatedSection>
          <AnimatedSection>
            <LiveDemoSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FreelancePlatformSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <HowItWorksSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <CVOptimizerSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FeaturesSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <PlanShowcaseSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <ReviewsSection />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <ExtensionDownloadSection />
          </AnimatedSection>
          <ErrorBoundary fallback={<div className="py-16" />}>
            <div className="overflow-visible">
              <PricingSection />
            </div>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
