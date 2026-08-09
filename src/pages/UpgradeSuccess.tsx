import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Crown,
  CheckCircle,
  Mail,
  ArrowRight,
  Sparkles,
  PartyPopper,
} from 'lucide-react';

const UpgradeSuccess = () => {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Animate through steps
    const timer1 = setTimeout(() => setStep(2), 1000);
    const timer2 = setTimeout(() => setStep(3), 2000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const planName = plan === 'elite' ? 'Elite' : 'Pro';
  const planIcon = plan === 'elite' ? Crown : Sparkles;
  const PlanIcon = planIcon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Animated checkmark */}
            <div className={`transition-all duration-500 ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold pulse-glow">
                <CheckCircle className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>

            {/* Title */}
            <div className={`transition-all duration-500 delay-200 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <PartyPopper className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome to Sovereign {planName}!
                </h1>
                <PartyPopper className="w-6 h-6 text-primary scale-x-[-1]" />
              </div>
              <p className="text-muted-foreground mb-6">
                Thank you for becoming a founding member.
              </p>
            </div>

            {/* Plan badge */}
            <div className={`transition-all duration-500 delay-300 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <PlanIcon className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">{planName} Plan</span>
                <span className="text-xs text-primary font-medium">LIFETIME</span>
              </div>
            </div>

            {/* Email confirmation */}
            <div className={`transition-all duration-500 delay-500 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">
                      Confirm Your Email
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Check your inbox for a confirmation email to complete your purchase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Access status */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">
                    Access Being Unlocked
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your {planName} features are being activated. This usually takes a few minutes.
                  If your access isn't updated within 24 hours, please contact support.
                </p>
              </div>

              {/* CTA */}
              <Link to="/dashboard">
                <Button variant="gold" className="w-full h-12">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Need help? Contact{' '}
          <a href="mailto:support@sovereignapp.com" className="text-primary hover:underline">
            support@sovereignapp.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default UpgradeSuccess;
