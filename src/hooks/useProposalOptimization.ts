import { useState } from 'react';
import { toast } from 'sonner';
import { postLiveOptimizeProposal } from '@/lib/liveGenerate';
import { publicUserError } from '@/lib/openaiErrors';

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

const EMPTY_SCORE: AcceptanceScoreResult = {
  score: 0,
  strengths: [],
  weaknesses: [],
  suggestions: [],
  summary: '',
};

const EMPTY_DECISION: DecisionMakerResult = {
  primaryDecisionMaker: { title: '', department: '', influence: '', linkedInSearchTip: '' },
  secondaryStakeholders: [],
  companyInsights: { companyType: '', hiringStyle: '', redFlags: [], greenFlags: [] },
  outreachStrategy: '',
};

const EMPTY_OUTREACH: OutreachMessagesResult = {
  linkedInConnectionRequest: '',
  linkedInFollowUp: '',
  coldEmail: { subject: '', body: '' },
  followUpEmail: { subject: '', body: '' },
  tips: [],
};

const EMPTY_STRATEGY: FullStrategyResult = {
  overallAssessment: { fitScore: 0, summary: '', verdict: '' },
  whyApplicationsFail: [],
  differentiators: [],
  riskFactors: [],
  actionPlan: [],
  interviewPrep: { likelyQuestions: [], questionsToAsk: [], keyTalkingPoints: [] },
  finalAdvice: '',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeResult(type: OptimizationType, raw: unknown): OptimizationResultData {
  if (type === 'company-rewrite' || type === 'tone-optimization') {
    return typeof raw === 'string' ? raw : String(asRecord(raw).text || asRecord(raw).result || '');
  }
  const rec = asRecord(raw);
  if (type === 'acceptance-score') {
    return {
      ...EMPTY_SCORE,
      score: Number(rec.score) || 0,
      strengths: Array.isArray(rec.strengths) ? rec.strengths.map(String) : [],
      weaknesses: Array.isArray(rec.weaknesses) ? rec.weaknesses.map(String) : [],
      suggestions: Array.isArray(rec.suggestions) ? rec.suggestions.map(String) : [],
      summary: String(rec.summary || ''),
    };
  }
  if (type === 'decision-maker') {
    const primary = asRecord(rec.primaryDecisionMaker);
    const insights = asRecord(rec.companyInsights);
    return {
      ...EMPTY_DECISION,
      primaryDecisionMaker: {
        title: String(primary.title || ''),
        department: String(primary.department || ''),
        influence: String(primary.influence || ''),
        linkedInSearchTip: String(primary.linkedInSearchTip || ''),
      },
      secondaryStakeholders: Array.isArray(rec.secondaryStakeholders)
        ? rec.secondaryStakeholders as DecisionMakerResult['secondaryStakeholders']
        : [],
      companyInsights: {
        companyType: String(insights.companyType || ''),
        hiringStyle: String(insights.hiringStyle || ''),
        redFlags: Array.isArray(insights.redFlags) ? insights.redFlags.map(String) : [],
        greenFlags: Array.isArray(insights.greenFlags) ? insights.greenFlags.map(String) : [],
      },
      outreachStrategy: String(rec.outreachStrategy || ''),
    };
  }
  if (type === 'outreach-messages') {
    const cold = asRecord(rec.coldEmail);
    const follow = asRecord(rec.followUpEmail);
    return {
      ...EMPTY_OUTREACH,
      linkedInConnectionRequest: String(rec.linkedInConnectionRequest || ''),
      linkedInFollowUp: String(rec.linkedInFollowUp || ''),
      coldEmail: { subject: String(cold.subject || ''), body: String(cold.body || '') },
      followUpEmail: { subject: String(follow.subject || ''), body: String(follow.body || '') },
      twitterDM: rec.twitterDM ? String(rec.twitterDM) : undefined,
      tips: Array.isArray(rec.tips) ? rec.tips.map(String) : [],
    };
  }
  const assessment = asRecord(rec.overallAssessment);
  const prep = asRecord(rec.interviewPrep);
  const salary = asRecord(rec.salaryInsight);
  return {
    ...EMPTY_STRATEGY,
    overallAssessment: {
      fitScore: Number(assessment.fitScore) || 0,
      summary: String(assessment.summary || ''),
      verdict: String(assessment.verdict || ''),
    },
    whyApplicationsFail: Array.isArray(rec.whyApplicationsFail)
      ? rec.whyApplicationsFail as FullStrategyResult['whyApplicationsFail']
      : [],
    differentiators: Array.isArray(rec.differentiators) ? rec.differentiators.map(String) : [],
    riskFactors: Array.isArray(rec.riskFactors) ? rec.riskFactors as FullStrategyResult['riskFactors'] : [],
    actionPlan: Array.isArray(rec.actionPlan) ? rec.actionPlan as FullStrategyResult['actionPlan'] : [],
    interviewPrep: {
      likelyQuestions: Array.isArray(prep.likelyQuestions) ? prep.likelyQuestions.map(String) : [],
      questionsToAsk: Array.isArray(prep.questionsToAsk) ? prep.questionsToAsk.map(String) : [],
      keyTalkingPoints: Array.isArray(prep.keyTalkingPoints) ? prep.keyTalkingPoints.map(String) : [],
    },
    salaryInsight: rec.salaryInsight
      ? {
          estimatedRange: String(salary.estimatedRange || ''),
          negotiationTips: Array.isArray(salary.negotiationTips) ? salary.negotiationTips.map(String) : [],
        }
      : undefined,
    finalAdvice: String(rec.finalAdvice || ''),
  };
}

export const useProposalOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentOptimization, setCurrentOptimization] = useState<OptimizationType | null>(null);
  const [error, setError] = useState('');

  const optimize = async (
    optimizationType: OptimizationType,
    proposal: string,
    jobDescription: string,
    companyInfo?: string,
  ): Promise<OptimizationResult | null> => {
    if (!proposal.trim()) {
      toast.error('Generate a proposal first before optimizing');
      return null;
    }

    setIsOptimizing(true);
    setCurrentOptimization(optimizationType);
    setError('');

    try {
      const live = await postLiveOptimizeProposal({
        optimizationType,
        proposal,
        jobDescription,
        jobContext: jobDescription,
        proposalHistory: proposal,
        companyInfo,
      });
      if (!live.ok || live.data == null) {
        const message = publicUserError(live.error || 'Connection timeout. Please try again.');
        setError(message);
        toast.error(message);
        return null;
      }
      const data: OptimizationResult = {
        type: optimizationType,
        result: normalizeResult(optimizationType, live.data.result),
      };
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
    } catch (err) {
      const message = publicUserError(err);
      setError(message);
      toast.error(message);
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
    error,
    setError,
  };
};
