import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CheckoutButton } from '@/components/checkout/CheckoutButton';
import {
  Crown,
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  Shield,
  Clock,
  Infinity,
} from 'lucide-react';
import { getCheckoutUrl, PLAN_PRICES } from '@/lib/plans';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: string;
  featureName?: string;
}

export const UpgradeModal = ({
  open,
  onOpenChange,
  currentPlan = 'free',
  featureName,
}: UpgradeModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'elite'>('pro');


  const proFeatures = [
    '78% higher acceptance rate on average',
    'Acceptance probability analysis',
    'AI-powered improvement suggestions',
    'Job matching diagnostics',
    'Save & access proposal history',
    'Export proposals',
  ];

  const eliteFeatures = [
    'Everything in Pro, plus:',
    'Visual acceptance probability charts',
    'Decision-maker identification',
    'Platform-ready outreach messages',
    'Target company recommendations',
    'Full application strategy system',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-gold">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Stop Getting Ignored
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {featureName ? (
                <>
                  <span className="text-primary font-medium">{featureName}</span> is a premium feature.
                  Pro users see <span className="text-primary font-semibold">78% higher acceptance rates</span>.
                </>
              ) : (
                <>
                  Pro users see <span className="text-primary font-semibold">78% higher acceptance rates</span>. Pay once, use forever.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Value proposition badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
              <Clock className="w-3 h-3" />
              Pay Once
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
              <Infinity className="w-3 h-3" />
              Use Forever
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
              <Shield className="w-3 h-3" />
              30-Day Guarantee
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 pt-2 space-y-4">
          {/* Pro Plan */}
          <div
            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedPlan === 'pro'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedPlan('pro')}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Pro</h3>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                  78% Better Results
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">${PLAN_PRICES.pro.monthly}</span>
                <span className="text-muted-foreground text-sm ml-1">/mo</span>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {proFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Elite Plan */}
          <div
            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedPlan === 'elite'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedPlan('elite')}
          >
            <div className="absolute -top-3 right-4">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-amber-600 text-primary-foreground text-xs font-medium">
                <Zap className="w-3 h-3" />
                Best Value
              </span>
            </div>
            <div className="flex items-start justify-between mb-3 mt-1">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Elite</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">${PLAN_PRICES.elite.monthly}</span>
                <span className="text-muted-foreground text-sm ml-1">/mo</span>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {eliteFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 space-y-3">
            <CheckoutButton
              href={getCheckoutUrl(selectedPlan)}
              variant="gold"
              className="w-full h-12 text-base"
            >
              Upgrade to {selectedPlan === 'pro' ? 'Pro' : 'Elite'} – $
              {selectedPlan === 'pro' ? PLAN_PRICES.pro.monthly : PLAN_PRICES.elite.monthly}/mo
              <ArrowRight className="w-4 h-4 ml-2" />
            </CheckoutButton>
            <p className="text-center text-xs text-muted-foreground">
              🔒 Secure checkout • 30-day money-back guarantee
            </p>
          </div>

          {/* Notice */}
          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">Lifetime Access:</span> Pay once, use forever with all future updates included.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
