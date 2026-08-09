import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Crown,
  CheckCircle,
  ArrowRight,
  Flame,
  Users,
  MessageSquare,
  Map,
  Target,
  BarChart3,
  Wand2,
  Sparkles,
} from 'lucide-react';

const EliteActivated = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    // Animate through steps
    const timer1 = setTimeout(() => setStep(2), 800);
    const timer2 = setTimeout(() => setStep(3), 1600);
    const timer3 = setTimeout(() => setStep(4), 2400);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const eliteFeatures = [
    {
      icon: Users,
      name: 'Decision-Maker Identification',
      description: 'Find the right people to contact at target companies',
    },
    {
      icon: MessageSquare,
      name: 'Outreach Message Generation',
      description: 'Personalized LinkedIn and email messages that get responses',
    },
    {
      icon: Map,
      name: 'Full Application Strategy',
      description: 'Complete strategy with insights on why applications fail and how to fix them',
    },
    {
      icon: Target,
      name: 'Company-Specific Rewriting',
      description: 'Tailored text optimized for specific companies and roles',
    },
    {
      icon: BarChart3,
      name: 'Acceptance Probability Score',
      description: 'AI-powered prediction of your application success rate',
    },
    {
      icon: Wand2,
      name: 'Tone & Structure Optimization',
      description: 'Perfect your message clarity, tone, and structure',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-card border border-amber-500/30 rounded-2xl p-8 relative overflow-hidden">
          {/* Elite gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Animated checkmark */}
            <div className={`transition-all duration-500 ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Title */}
            <div className={`transition-all duration-500 delay-200 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-7 h-7 text-amber-500" />
                <h1 className="text-3xl font-bold text-foreground">
                  Elite Access Unlocked
                </h1>
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-muted-foreground text-center mb-8">
                Welcome to the inner circle. You now have access to our most powerful features.
              </p>
            </div>

            {/* Elite badge */}
            <div className={`transition-all duration-500 delay-300 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-amber-500">ELITE MEMBER</span>
                  <span className="text-xs text-amber-600/80 font-medium">LIFETIME</span>
                </div>
              </div>
            </div>

            {/* Features unlocked */}
            <div className={`transition-all duration-500 delay-500 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-muted/30 rounded-xl p-6 mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Features Now Available
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eliteFeatures.map((feature, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                        <feature.icon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground block">
                          {feature.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {feature.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className={`transition-all duration-500 delay-700 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Access status */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-foreground text-sm">
                    Elite Mode Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Your Elite features are being activated. This usually takes a few minutes.
                  If your access isn't updated within 24 hours, please contact support.
                </p>
              </div>

              <Link to={isAuthenticated ? '/dashboard' : '/auth'}>
                <Button 
                  className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Go to Elite Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Need help? Contact{' '}
          <a href="mailto:support@sovereignapp.com" className="text-amber-500 hover:underline">
            support@sovereignapp.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default EliteActivated;