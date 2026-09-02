import { invokeEdgeJson } from '@/lib/edgeFunctions';

export interface InterviewQuestion {
  id: string;
  type: 'behavioral' | 'technical';
  prompt: string;
}

export interface InterviewFeedback {
  confidence: number;
  keywordCoverage: number;
  structure: number;
  notes: string[];
}

const FALLBACK_BEHAVIORAL = [
  'Tell me about a time you delivered under a tight deadline. What was the outcome?',
  'Describe a conflict with a stakeholder and how you resolved it.',
  'Walk me through a failure. What did you change afterwards?',
];

const FALLBACK_TECHNICAL = [
  'Walk through a technical decision you made recently and why you chose that approach.',
  'How would you debug a production issue with incomplete logs?',
  'Explain a complex system from your CV to a non-technical interviewer.',
];

export function generateLocalQuestions(cvText: string, jobDescription: string): InterviewQuestion[] {
  const jd = jobDescription || 'this role';
  const skills = Array.from(new Set((cvText + ' ' + jobDescription).match(/\b[A-Z][A-Za-z+#.]{2,}\b/g) ?? [])).slice(0, 6);
  const skillHint = skills[0] ?? 'your core stack';
  return [
    { id: 'b1', type: 'behavioral', prompt: `Based on this JD (${jd.slice(0, 80)}…), tell me about a time you owned a similar outcome end-to-end.` },
    { id: 'b2', type: 'behavioral', prompt: FALLBACK_BEHAVIORAL[1] },
    { id: 't1', type: 'technical', prompt: `How have you applied ${skillHint} in production? Include metrics.` },
    { id: 't2', type: 'technical', prompt: FALLBACK_TECHNICAL[1] },
    { id: 'b3', type: 'behavioral', prompt: FALLBACK_BEHAVIORAL[2] },
    { id: 't3', type: 'technical', prompt: FALLBACK_TECHNICAL[2] },
  ];
}

export async function generateInterviewQuestions(cvText: string, jobDescription: string): Promise<InterviewQuestion[]> {
  const fallback = generateLocalQuestions(cvText, jobDescription);
  const result = await invokeEdgeJson<{ questions?: InterviewQuestion[] }>('generate-proposal', {
    mode: 'interview_sim',
    cvText,
    jobDescription,
  });
  if (result.data?.questions?.length) return result.data.questions;
  return fallback;
}

export function scoreAnswer(answer: string, question: InterviewQuestion, jobDescription: string): InterviewFeedback {
  const text = answer.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const fillers = (text.match(/\b(um|uh|like|you know|sort of|kind of)\b/gi) ?? []).length;
  const starHits = ['situation', 'task', 'action', 'result', 'because', 'impact', '%'].filter((k) =>
    text.toLowerCase().includes(k),
  ).length;
  const jdTokens = jobDescription.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 4);
  const hits = jdTokens.filter((t) => text.toLowerCase().includes(t));
  const keywordCoverage = jdTokens.length ? Math.min(100, Math.round((hits.length / Math.min(jdTokens.length, 20)) * 100)) : Math.min(100, words.length);
  const confidence = Math.max(10, Math.min(98, 40 + Math.min(words.length, 180) / 3 - fillers * 6));
  const structure = question.type === 'behavioral'
    ? Math.min(100, 20 + starHits * 14 + Math.min(words.length, 80) / 2)
    : Math.min(100, 30 + (/\b(because|therefore|architecture|trade-?off)\b/i.test(text) ? 25 : 0) + Math.min(words.length, 100) / 2);

  const notes: string[] = [];
  if (words.length < 40) notes.push('Answer is short — add a concrete example and a measured result.');
  if (fillers >= 3) notes.push('Reduce filler words; pause instead of “um/like”.');
  if (question.type === 'behavioral' && starHits < 2) notes.push('Use STAR: Situation, Task, Action, Result.');
  if (keywordCoverage < 30) notes.push('Mirror 2–3 keywords from the job description.');
  if (!notes.length) notes.push('Strong structure. Tighten the close with a quantified outcome.');

  return {
    confidence: Math.round(confidence),
    keywordCoverage,
    structure: Math.round(structure),
    notes,
  };
}
