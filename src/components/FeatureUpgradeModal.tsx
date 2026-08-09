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
  ArrowRight,
  Shield,
  Flame,
  Target,
  MessageSquare,
  BarChart3,
  Wand2,
  Users,
} from 'lucide-react';
import { getCheckoutUrl, PLAN_PRICES, getRequiredPlanForFeature, PlanLimits } from '@/lib/plans';

interface FeatureUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  feature?: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>;
  featureName?: string;
}

interface ModalContent {
  title: string;
  description: string;
  buttonText: string;
  targetPlan: 'pro' | 'elite';
  features: string[];
}

const getModalContent = (
  currentPlan: string,
  feature?: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>
): ModalContent => {
  // Determine if this is an Elite feature
  const requiredPlan = feature ? getRequiredPlanForFeature(feature) : 'pro';
  
  // If user is on Pro and trying to access Elite feature
  if (currentPlan === 'pro' && requiredPlan === 'elite') {
    return {
      title: 'This is an Elite Feature',
      description: 'Elite focuses on STRATEGY & EXECUTION—visual probability graphs, platform recommendations, and ready-to-paste outreach messages.',
      buttonText: 'Go Elite — Build My Strategy',
      targetPlan: 'elite',
      features: [
        'Visual acceptance probability graph',
        'Strategic reasoning & platform recommendations',
        'Ready-to-paste outreach messages',
        'Complete application strategy with targets',
      ],
    };
  }
  
  // Default: Free user trying to access Pro or Elite feature
  if (requiredPlan === 'elite') {
    return {
      title: 'This is an Elite Feature',
      description: 'Elite focuses on STRATEGY & EXECUTION—visual probability graphs, platform recommendations, and ready-to-paste outreach messages.',
      buttonText: 'Go Elite — Build My Strategy',
      targetPlan: 'elite',
      features: [
        'Everything in Pro, plus:',
        'Visual acceptance probability graph',
        'Platform & company recommendations',
        'Ready-to-paste outreach messages',
      ],
    };
  }
  
  // Pro focuses on DIAGNOSIS
  return {
    title: 'Unlock Pro for Diagnosis',
    description: 'Pro focuses on DIAGNOSIS—understand why your applications succeed or fail with acceptance probability scores and improvement insights.',
    buttonText: 'Upgrade to Pro',
    targetPlan: 'pro',
    features: [
      'Acceptance probability score (%)',
      'Explanation of why applications fail or succeed',
      'Job matching analysis',
      'AI suggestions to improve acceptance',
    ],
  };
};

export const FeatureUpgradeModal = ({
  open,
  onOpenChange,
  currentPlan = 'free',
  feature,
  featureName,
}: FeatureUpgradeModalProps) => {
  const content = getModalContent(currentPlan, feature);
  

  const Icon = content.targetPlan === 'elite' ? Crown : Sparkles;
  const price = PLAN_PRICES[content.targetPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={`p-6 pb-4 ${
          content.targetPlan === 'elite' 
            ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent'
            : 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent'
        }`}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                content.targetPlan === 'elite'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-primary to-amber-600'
              }`}>
                {content.targetPlan === 'elite' ? (
                  <Flame className="w-6 h-6 text-white" />
                ) : (
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {content.title}
                </DialogTitle>
                {featureName && (
                  <span className="text-sm text-primary font-medium">
                    Unlock: {featureName}
                  </span>
                )}
              </div>
            </div>
            <DialogDescription className="text-muted-foreground text-base">
              {content.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Features */}
        <div className="px-6 py-4">
          <ul className="space-y-3">
            {content.features.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  content.targetPlan === 'elite' 
                    ? 'bg-amber-500/20 text-amber-500' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  {getFeatureIcon(feat, i)}
                </div>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="p-6 pt-2 space-y-3">
          <CheckoutButton
            href={getCheckoutUrl(content.targetPlan)}
            variant="gold"
            className={`w-full h-12 text-base ${
              content.targetPlan === 'elite' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' 
                : ''
            }`}
          >
            <Icon className="w-5 h-5 mr-2" />
            {content.buttonText} – ${price.monthly}/mo
            <ArrowRight className="w-4 h-4 ml-2" />
          </CheckoutButton>
          <p className="text-center text-xs text-muted-foreground">
            🔒 Secure checkout • 30-day money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getFeatureIcon(feature: string, index: number) {
  const iconClass = "w-3 h-3";
  
  if (feature.toLowerCase().includes('decision-maker') || feature.toLowerCase().includes('identification')) {
    return <Users className={iconClass} />;
  }
  if (feature.toLowerCase().includes('outreach') || feature.toLowerCase().includes('message')) {
    return <MessageSquare className={iconClass} />;
  }
  if (feature.toLowerCase().includes('strategy')) {
    return <Target className={iconClass} />;
  }
  if (feature.toLowerCase().includes('score') || feature.toLowerCase().includes('probability')) {
    return <BarChart3 className={iconClass} />;
  }
  if (feature.toLowerCase().includes('tone') || feature.toLowerCase().includes('optimization')) {
    return <Wand2 className={iconClass} />;
  }
  if (feature.toLowerCase().includes('company') || feature.toLowerCase().includes('rewriting')) {
    return <Target className={iconClass} />;
  }
  
  return <Sparkles className={iconClass} />;
}
