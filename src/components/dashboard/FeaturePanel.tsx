import { useState } from 'react';

import { 
  Lock, 
  Sparkles, 
  Crown, 
  Flame,
  Target,
  BarChart3,
  Wand2,
  Users,
  MessageSquare,
  Map,
  Loader2,
} from 'lucide-react';
import { canAccessFeature, PlanLimits, isElitePlan, isProPlan } from '@/lib/plans';
import { FeatureUpgradeModal } from '@/components/FeatureUpgradeModal';
import { AcceptanceScoreModal } from '@/components/dashboard/AcceptanceScoreModal';
import { DecisionMakerModal } from '@/components/dashboard/DecisionMakerModal';
import { OutreachMessagesModal } from '@/components/dashboard/OutreachMessagesModal';
import { FullStrategyModal } from '@/components/dashboard/FullStrategyModal';
import { 
  useProposalOptimization, 
  OptimizationType, 
  AcceptanceScoreResult,
  DecisionMakerResult,
  OutreachMessagesResult,
  FullStrategyResult,
} from '@/hooks/useProposalOptimization';
import { toast } from 'sonner';

interface FeaturePanelProps {
  currentPlan: string;
  generatedProposal: string;
  jobDescription: string;
  onProposalUpdate: (newProposal: string) => void;
}

interface FeatureItem {
  id: keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'>;
  name: string;
  description: string;
  tier: 'pro' | 'elite';
  icon: React.ElementType;
  optimizationType?: OptimizationType;
}

// PRO focuses on DIAGNOSIS
const PRO_FEATURES: FeatureItem[] = [
  {
    id: 'hasAcceptanceScore',
    name: 'Acceptance Score',
    description: 'Know your success probability (%)',
    tier: 'pro',
    icon: BarChart3,
    optimizationType: 'acceptance-score',
  },
  {
    id: 'hasCompanyRewriting',
    name: 'Why It May Fail',
    description: 'Diagnose application weaknesses',
    tier: 'pro',
    icon: Target,
    optimizationType: 'company-rewrite',
  },
  {
    id: 'hasToneOptimization',
    name: 'Job Match Analysis',
    description: 'Which jobs fit your profile',
    tier: 'pro',
    icon: Wand2,
    optimizationType: 'tone-optimization',
  },
];

// ELITE focuses on STRATEGY & EXECUTION
const ELITE_FEATURES: FeatureItem[] = [
  {
    id: 'hasFullStrategy',
    name: 'Visual Probability Graph',
    description: 'See your acceptance odds visually',
    tier: 'elite',
    icon: BarChart3,
    optimizationType: 'full-strategy',
  },
  {
    id: 'hasDecisionMakerIdentification',
    name: 'Target Platforms',
    description: 'Where to apply & who to contact',
    tier: 'elite',
    icon: Users,
    optimizationType: 'decision-maker',
  },
  {
    id: 'hasOutreachMessages',
    name: 'Outreach Messages',
    description: 'Ready-to-paste for LinkedIn, email',
    tier: 'elite',
    icon: MessageSquare,
    optimizationType: 'outreach-messages',
  },
];

export const FeaturePanel = ({ 
  currentPlan, 
  generatedProposal, 
  jobDescription,
  onProposalUpdate,
}: FeaturePanelProps) => {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<keyof Omit<PlanLimits, 'dailyProposals' | 'dailyDownloads' | 'dailyCVGenerations'> | undefined>();
  const [selectedFeatureName, setSelectedFeatureName] = useState<string>('');
  
  // Modal states
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreResult, setScoreResult] = useState<AcceptanceScoreResult | null>(null);
  
  const [showDecisionMakerModal, setShowDecisionMakerModal] = useState(false);
  const [decisionMakerResult, setDecisionMakerResult] = useState<DecisionMakerResult | null>(null);
  
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [outreachResult, setOutreachResult] = useState<OutreachMessagesResult | null>(null);
  
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [strategyResult, setStrategyResult] = useState<FullStrategyResult | null>(null);
  
  const { optimize, isOptimizing, currentOptimization } = useProposalOptimization();

  const handleFeatureClick = async (feature: FeatureItem) => {
    const hasAccess = canAccessFeature(currentPlan, feature.id);
    
    if (!hasAccess) {
      setSelectedFeature(feature.id);
      setSelectedFeatureName(feature.name);
      setShowUpgrade(true);
      return;
    }
    
    if (!generatedProposal) {
      toast.error('Generate a proposal first before using optimization features');
      return;
    }
    
    if (!feature.optimizationType) {
      toast.info('This feature is coming soon!');
      return;
    }
    
    const result = await optimize(
      feature.optimizationType,
      generatedProposal,
      jobDescription
    );
    
    if (result) {
      switch (feature.optimizationType) {
        case 'acceptance-score':
          setScoreResult(result.result as AcceptanceScoreResult);
          setShowScoreModal(true);
          break;
        case 'decision-maker':
          setDecisionMakerResult(result.result as DecisionMakerResult);
          setShowDecisionMakerModal(true);
          break;
        case 'outreach-messages':
          setOutreachResult(result.result as OutreachMessagesResult);
          setShowOutreachModal(true);
          break;
        case 'full-strategy':
          setStrategyResult(result.result as FullStrategyResult);
          setShowStrategyModal(true);
          break;
        default:
          // For rewriting features, update the proposal
          onProposalUpdate(result.result as string);
      }
    }
  };

  const renderFeatureButton = (feature: FeatureItem) => {
    const hasAccess = canAccessFeature(currentPlan, feature.id);
    const Icon = feature.icon;
    const isElite = feature.tier === 'elite';
    const isLoading = isOptimizing && currentOptimization === feature.optimizationType;
    const isDisabled = (!generatedProposal && hasAccess) || isOptimizing;
    
    return (
      <button
        key={feature.id}
        onClick={() => handleFeatureClick(feature)}
        disabled={isDisabled}
        className={`
          relative w-full p-3 rounded-xl border text-left transition-all group
          ${hasAccess 
            ? isElite
              ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:border-amber-500/50 hover:from-amber-500/15 hover:to-orange-500/10'
              : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5' 
            : 'border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center shrink-0
            ${hasAccess 
              ? isElite 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' 
                : 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
            }
          `}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasAccess ? (
              <Icon className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                hasAccess 
                  ? isElite 
                    ? 'text-amber-500' 
                    : 'text-foreground'
                  : 'text-muted-foreground'
              }`}>
                {feature.name}
              </span>
              {!hasAccess && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  isElite 
                    ? 'bg-amber-500/20 text-amber-600' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  {isElite ? 'Elite' : 'Pro'}
                </span>
              )}
              {hasAccess && isElite && (
                <Flame className="w-3 h-3 text-orange-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {isLoading ? 'Processing...' : feature.description}
            </p>
          </div>
        </div>
        
        {/* Elite flame indicator for locked features */}
        {isElite && !hasAccess && (
          <div className="absolute -top-1 -right-1">
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Pro Features Section - DIAGNOSIS */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Pro Features</h3>
            {(isProPlan(currentPlan) || isElitePlan(currentPlan)) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">Diagnosis: Know why you're getting ignored</p>
          <div className="space-y-2">
            {PRO_FEATURES.map(renderFeatureButton)}
          </div>
        </div>

        {/* Elite Features Section - STRATEGY & EXECUTION */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Elite Features</h3>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            {isElitePlan(currentPlan) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-medium">
                Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">Strategy & Execution: Get replies and results</p>
          <div className="space-y-2">
            {ELITE_FEATURES.map(renderFeatureButton)}
          </div>
        </div>
      </div>

      <FeatureUpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        feature={selectedFeature}
        featureName={selectedFeatureName}
      />
      
      <AcceptanceScoreModal
        open={showScoreModal}
        onOpenChange={setShowScoreModal}
        result={scoreResult}
      />
      
      <DecisionMakerModal
        open={showDecisionMakerModal}
        onOpenChange={setShowDecisionMakerModal}
        result={decisionMakerResult}
      />
      
      <OutreachMessagesModal
        open={showOutreachModal}
        onOpenChange={setShowOutreachModal}
        result={outreachResult}
      />
      
      <FullStrategyModal
        open={showStrategyModal}
        onOpenChange={setShowStrategyModal}
        result={strategyResult}
      />
    </>
  );
};
