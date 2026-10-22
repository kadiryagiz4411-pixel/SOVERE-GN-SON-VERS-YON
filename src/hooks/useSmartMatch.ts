import { useState } from 'react';
import { postLiveSmartMatch } from '@/lib/liveGenerate';
import { publicUserError } from '@/lib/openaiErrors';

export interface SmartMatchResult {
  jobParsing: {
    requiredSkills: string[];
    yearsOfExperience: string;
    coreTechnologies: string[];
    companyValues: string[];
    roleLevel: string;
    workType: string;
    estimatedSalary: string;
  };
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    experienceMatch: number;
    cultureMatch: number;
    technicalMatch: number;
  };
  platformAcceptance: {
    upwork: number;
    fiverr: number;
    linkedin: number;
    corporate: number;
  };
  gapAnalysis: {
    strengths: Array<{ area: string; detail: string }>;
    gaps: Array<{ area: string; detail: string; suggestion: string }>;
  };
  coverLetter: string;
  linkedInOutreach: string;
  sampleJobListings: Array<{ title: string; platform: string; budget: string; matchReason: string }>;
  topAlignmentPoints: string[];
  applicationTips: string[];
  status: string;
}

const EMPTY: SmartMatchResult = {
  jobParsing: {
    requiredSkills: [],
    yearsOfExperience: 'Not clearly stated',
    coreTechnologies: [],
    companyValues: [],
    roleLevel: 'Not specified',
    workType: 'Not specified',
    estimatedSalary: 'N/A',
  },
  matchScore: 0,
  matchBreakdown: { skillsMatch: 0, experienceMatch: 0, cultureMatch: 0, technicalMatch: 0 },
  platformAcceptance: { upwork: 0, fiverr: 0, linkedin: 0, corporate: 0 },
  gapAnalysis: { strengths: [], gaps: [] },
  coverLetter: '',
  linkedInOutreach: '',
  sampleJobListings: [],
  topAlignmentPoints: [],
  applicationTips: [],
  status: 'analysis_complete',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

export function normalizeSmartMatch(raw: unknown): SmartMatchResult {
  const rec = asRecord(raw);
  const job = asRecord(rec.jobParsing);
  const breakdown = asRecord(rec.matchBreakdown);
  const platforms = asRecord(rec.platformAcceptance);
  const gaps = asRecord(rec.gapAnalysis);
  return {
    ...EMPTY,
    jobParsing: {
      requiredSkills: asStringList(job.requiredSkills),
      yearsOfExperience: String(job.yearsOfExperience || EMPTY.jobParsing.yearsOfExperience),
      coreTechnologies: asStringList(job.coreTechnologies),
      companyValues: asStringList(job.companyValues),
      roleLevel: String(job.roleLevel || EMPTY.jobParsing.roleLevel),
      workType: String(job.workType || EMPTY.jobParsing.workType),
      estimatedSalary: String(job.estimatedSalary || EMPTY.jobParsing.estimatedSalary),
    },
    matchScore: Number(rec.matchScore) || 0,
    matchBreakdown: {
      skillsMatch: Number(breakdown.skillsMatch) || 0,
      experienceMatch: Number(breakdown.experienceMatch) || 0,
      cultureMatch: Number(breakdown.cultureMatch) || 0,
      technicalMatch: Number(breakdown.technicalMatch) || 0,
    },
    platformAcceptance: {
      upwork: Number(platforms.upwork) || 0,
      fiverr: Number(platforms.fiverr) || 0,
      linkedin: Number(platforms.linkedin) || 0,
      corporate: Number(platforms.corporate) || 0,
    },
    gapAnalysis: {
      strengths: Array.isArray(gaps.strengths) ? gaps.strengths as SmartMatchResult['gapAnalysis']['strengths'] : [],
      gaps: Array.isArray(gaps.gaps) ? gaps.gaps as SmartMatchResult['gapAnalysis']['gaps'] : [],
    },
    coverLetter: String(rec.coverLetter || ''),
    linkedInOutreach: String(rec.linkedInOutreach || ''),
    sampleJobListings: Array.isArray(rec.sampleJobListings)
      ? rec.sampleJobListings as SmartMatchResult['sampleJobListings']
      : [],
    topAlignmentPoints: asStringList(rec.topAlignmentPoints),
    applicationTips: asStringList(rec.applicationTips),
    status: String(rec.status || 'analysis_complete'),
  };
}

export function useSmartMatch() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartMatchResult | null>(null);
  const [error, setError] = useState('');

  const run = async (jobDescription: string, outputLanguage = 'en', skills: string[] = []) => {
    setIsAnalyzing(true);
    setError('');
    try {
      const live = await postLiveSmartMatch({
        jobDescription,
        jobContext: jobDescription,
        outputLanguage,
        skills,
      });
      if (!live.ok || live.data == null) {
        const message = publicUserError(live.error || 'Connection timeout. Retrying Smart Match...');
        setError(message);
        return null;
      }
      const next = normalizeSmartMatch(live.data);
      setResult(next);
      return next;
    } catch (err) {
      const message = publicUserError(err);
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { run, isAnalyzing, result, error, setResult, setError };
}
