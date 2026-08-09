import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OptimizationType = 
  | 'company-rewrite' 
  | 'acceptance-score' 
  | 'tone-optimization'
  | 'decision-maker'
  | 'outreach-messages'
  | 'full-strategy';

export interface AcceptanceScoreResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

export interface DecisionMakerResult {
  primaryDecisionMaker: {
    title: string;
    department: string;
    influence: string;
    linkedInSearchTip: string;
  };
  secondaryStakeholders: Array<{
    title: string;
    role: string;
  }>;
  companyInsights: {
    companyType: string;
    hiringStyle: string;
    redFlags: string[];
    greenFlags: string[];
  };
  outreachStrategy: string;
}

export interface OutreachMessagesResult {
  linkedInConnectionRequest: string;
  linkedInFollowUp: string;
  coldEmail: {
    subject: string;
    body: string;
  };
  followUpEmail: {
    subject: string;
    body: string;
  };
  twitterDM?: string;
  tips: string[];
}

export interface FullStrategyResult {
  overallAssessment: {
    fitScore: number;
    summary: string;
    verdict: string;
  };
  whyApplicationsFail: Array<{
    reason: string;
    howToAvoid: string;
  }>;
  differentiators: string[];
  riskFactors: Array<{
    risk: string;
    mitigation: string;
  }>;
  actionPlan: Array<{
    step: number;
    action: string;
    timing: string;
    priority: string;
  }>;
  interviewPrep: {
    likelyQuestions: string[];
    questionsToAsk: string[];
    keyTalkingPoints: string[];
  };
  salaryInsight?: {
    estimatedRange: string;
    negotiationTips: string[];
  };
  finalAdvice: string;
}

export type OptimizationResultData = 
  | string 
  | AcceptanceScoreResult 
  | DecisionMakerResult 
  | OutreachMessagesResult 
  | FullStrategyResult;

export interface OptimizationResult {
  type: OptimizationType;
  result: OptimizationResultData;
}

export const useProposalOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentOptimization, setCurrentOptimization] = useState<OptimizationType | null>(null);

  const optimize = async (
    optimizationType: OptimizationType,
    proposal: string,
    jobDescription: string,
    companyInfo?: string
  ): Promise<OptimizationResult | null> => {
    if (!proposal.trim()) {
      toast.error('Generate a proposal first before optimizing');
      return null;
    }

    setIsOptimizing(true);
    setCurrentOptimization(optimizationType);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to use optimization features');
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-proposal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            proposal,
            jobDescription,
            optimizationType,
            companyInfo,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 403) {
          const isEliteFeature = ['decision-maker', 'outreach-messages', 'full-strategy'].includes(optimizationType);
          toast.error(isEliteFeature 
            ? 'Upgrade to Elite to use this feature' 
            : 'Upgrade to Pro to use optimization features'
          );
          return null;
        }
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          return null;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please try again later.');
          return null;
        }
        
        throw new Error(errorData.error || 'Optimization failed');
      }

      const data: OptimizationResult = await response.json();
      
      const successMessages: Record<OptimizationType, string> = {
        'company-rewrite': 'Proposal rewritten for target company!',
        'acceptance-score': 'Acceptance analysis complete!',
        'tone-optimization': 'Tone and structure optimized!',
        'decision-maker': 'Decision-makers identified!',
        'outreach-messages': 'Outreach messages generated!',
        'full-strategy': 'Full strategy created!',
      };
      
      toast.success(successMessages[optimizationType]);
      return data;
      
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error(error instanceof Error ? error.message : 'Optimization failed');
      return null;
    } finally {
      setIsOptimizing(false);
      setCurrentOptimization(null);
    }
  };

  return {
    optimize,
    isOptimizing,
    currentOptimization,
  };
};
