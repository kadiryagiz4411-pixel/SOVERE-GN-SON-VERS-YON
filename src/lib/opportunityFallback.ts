import { resolveOpportunityHref, type OpportunityItem } from '@/lib/opportunities';
import { scoreOpportunity, type MatchProfile } from '@/lib/matchScore';

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
  profile?: MatchProfile,
): QueueOpportunityRow {
  const match = scoreOpportunity(profile, item.title, item.description, item.budget, item.skills);
  const score = match.complete ? match.matchScore : 0;
  const acceptance = match.complete ? match.acceptanceScore : 0;
  return {
    job_title: item.title,
    company: item.clientCountry ? `${item.platform} · ${item.clientCountry}` : item.platform,
    platform: item.platform,
    budget: item.budget || '',
    job_url: resolveOpportunityHref(item.platform, item.url, item.title),
    job_description: item.description,
    match_score: score,
    acceptance_probability: acceptance,
    match_reasoning: match.complete
      ? [
          match.matchedSkills.length
            ? `Matched skills: ${match.matchedSkills.slice(0, 4).join(', ')}`
            : 'Limited overlap with your onboarding skills',
          match.missingSkills.length
            ? `Job also asks for: ${match.missingSkills.slice(0, 4).join(', ')}`
            : 'Required skills largely overlap your profile',
          item.budget ? `Budget ${item.budget}` : 'Open the listing to confirm budget',
        ]
      : [match.message || 'Complete onboarding to calculate match scores'],
    rejection_reason: null,
    generated_proposal: '',
    skills_matched: match.matchedSkills.length ? match.matchedSkills : item.skills,
    competition_level: score >= 80 ? 'low' : score >= 45 ? 'medium' : 'high',
    client_quality_score: score,
    urgency: Date.now() - Date.parse(item.postedAt) < 1000 * 60 * 60 * 12 ? 'high' : 'medium',
    status: 'pending',
    user_id: userId,
    batch_id: batchId,
  };
}
