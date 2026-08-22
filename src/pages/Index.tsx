import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValueBarSection } from '@/components/landing/ValueBarSection';
import { StatsCounterSection } from '@/components/landing/StatsCounterSection';
import { BeforeAfterSection } from '@/components/landing/BeforeAfterSection';
import { AcceptancePredictorSection } from '@/components/landing/AcceptancePredictorSection';
import { TrustStripSection } from '@/components/landing/TrustStripSection';
import { LiveDemoSection } from '@/components/landing/LiveDemoSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CVOptimizerSection } from '@/components/landing/CVOptimizerSection';
import { PlanShowcaseSection } from '@/components/landing/PlanShowcaseSection';
import { ReviewsSection } from '@/components/landing/ReviewsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FreelancePlatformSection } from '@/components/landing/FreelancePlatformSection';
import { OnboardingSection } from '@/components/landing/OnboardingSection';
import { AnimatedSection } from '@/components/landing/AnimatedSection';
import { useSession } from '@/contexts/SessionContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, sessionReady } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasAdParams = searchParams.get('utm_source') ||
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

    if (sessionReady && user) {
      navigate('/dashboard', { replace: true });
    }

    const hasVisited = localStorage.getItem('sovereign-visited');
    if (!hasVisited) {
      setShowOnboarding(true);
      localStorage.setItem('sovereign-visited', 'true');
    }
  }, [searchParams, navigate, sessionReady, user]);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        {/* Show inline onboarding quiz for first-time visitors */}
        {showOnboarding && (
          <AnimatedSection>
            <OnboardingSection />
          </AnimatedSection>
        )}
        <ValueBarSection />
        <StatsCounterSection />
        <AnimatedSection>
          <AcceptancePredictorSection />
        </AnimatedSection>
        <TrustStripSection />
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
          <PricingSection />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
