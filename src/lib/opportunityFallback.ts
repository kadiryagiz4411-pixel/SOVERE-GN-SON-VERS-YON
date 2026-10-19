import type { OpportunityItem } from '@/lib/opportunities';

export interface QueueOpportunityRow {
  job_title: string;
  company: string;
  platform: string;
  budget: string;
  job_url: string;
  job_description: string;
  match_score: number;
  acceptance_probability: number;
  match_reasoning: string[];
  rejection_reason: string | null;
  generated_proposal: string;
  skills_matched: string[];
  competition_level: string;
  client_quality_score: number;
  urgency: string;
  status: string;
  user_id: string;
  batch_id: string;
}

export function opportunityToQueueRow(
  item: OpportunityItem,
  userId: string,
  batchId: string,
): QueueOpportunityRow {
  const score = Math.max(0, Math.min(100, Number(item.compatibilityScore ?? 70)));
  return {
    job_title: item.title,
    company: item.clientCountry ? `${item.platform} · ${item.clientCountry}` : item.platform,
    platform: item.platform,
    budget: item.budget || '',
    job_url: item.url,
    job_description: item.description,
    match_score: score,
    acceptance_probability: Math.max(50, score - 6),
    match_reasoning: [
      `Live ${item.platform} listing matched your scan`,
      item.skills.length ? `Skills: ${item.skills.slice(0, 4).join(', ')}` : 'Keyword overlap with your profile',
      item.budget ? `Budget ${item.budget}` : 'Open the listing to confirm budget',
    ],
    rejection_reason: null,
    generated_proposal: '',
    skills_matched: item.skills,
    competition_level: score >= 88 ? 'low' : 'medium',
    client_quality_score: score,
    urgency: Date.now() - Date.parse(item.postedAt) < 1000 * 60 * 60 * 12 ? 'high' : 'medium',
    status: 'pending',
    user_id: userId,
    batch_id: batchId,
  };
}
