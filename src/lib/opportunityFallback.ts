export interface FallbackOpportunity {
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
}

export function buildFallbackOpportunities(profile: Record<string, unknown> | null | undefined): FallbackOpportunity[] {
  const skills = Array.isArray(profile?.skills)
    ? (profile!.skills as string[]).filter(Boolean)
    : ['Proposal writing', 'ATS optimization', 'Client communication'];
  const title = String(profile?.profession_cluster || profile?.onboarding_role || 'Specialist');
  const platforms = ['Upwork', 'LinkedIn', 'Fiverr'];
  const scores = [98, 91, 87, 82, 76];

  return scores.map((score, i) => ({
    job_title: `${title} — ${['Retainer', 'Sprint', 'Launch', 'Audit', 'Growth'][i]} engagement`,
    company: ['Northline Studio', 'Harbor & Co.', 'Lumen Labs', 'Aster Agency', 'Pinnacle Hire'][i],
    platform: platforms[i % platforms.length],
    budget: i % 2 === 0 ? '$2,400–$4,000' : '$45–$75/hr',
    job_url: 'https://www.upwork.com/nx/search/jobs',
    job_description: `We're hiring a ${title.toLowerCase()} to improve conversion and application quality. Core skills: ${skills.slice(0, 4).join(', ') || 'communication and delivery'}.`,
    match_score: score,
    acceptance_probability: Math.max(62, score - 8),
    match_reasoning: [
      `Title and skill cluster match your ${title} profile`,
      'Budget is aligned with typical paid-plan targets',
      'Competition is moderate for this brief type',
    ],
    rejection_reason: null,
    generated_proposal: `Hi — I can take this ${title.toLowerCase()} brief from intake to a client-ready package within 48 hours, using your stack (${skills.slice(0, 3).join(', ') || 'proven delivery'}). I'll start with a 15-minute diagnostic, then ship a scored first draft.`,
    skills_matched: skills.slice(0, 4),
    competition_level: score >= 90 ? 'low' : 'medium',
    client_quality_score: score,
    urgency: score >= 90 ? 'high' : 'medium',
    status: 'pending',
  }));
}
