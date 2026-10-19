import { jsonNoStore, preflightNoStore, readJsonBody } from './_lib/cors.js';
import { scoreOpportunity, type MatchProfile } from './_lib/matchScore.js';
import {
  collectLiveOpportunities,
  dedupeOpportunities,
  fromExtensionPayload,
  parseKeywords,
  withValidUrl,
  type OpportunityItem,
  type OpportunityPlatform,
} from './_lib/opportunitySources.js';

export type { OpportunityItem, OpportunityPlatform };

// Vite/Vercel handler: always live-fetch. jsonNoStore + outbound cache:no-store
// are the equivalent of force-dynamic, revalidate 0, and fetchCache no-store.
export const config = { runtime: 'edge', maxDuration: 25 };

function platformParam(raw: string | null): OpportunityPlatform | 'All' {
  const value = String(raw || '').trim();
  if (!value || value.toLowerCase() === 'all') return 'All';
  if (value === 'Fiverr' || value === 'Upwork' || value === 'Freelancer' || value === 'LinkedIn') return value;
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  if (titled === 'Fiverr' || titled === 'Upwork' || titled === 'Freelancer' || titled === 'LinkedIn') return titled;
  return 'All';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflightNoStore();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonNoStore({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const keywords = parseKeywords(url.searchParams.get('q') || url.searchParams.get('query') || '');
    const platform = platformParam(url.searchParams.get('platform'));
    const ingested: OpportunityItem[] = [];
    let profile: MatchProfile = { skills: keywords };

    if (req.method === 'POST') {
      const body = await readJsonBody<{
        items?: OpportunityItem[];
        pageText?: string;
        pageTitle?: string;
        pageUrl?: string;
        platform?: string;
        q?: string;
        query?: string;
        skills?: string[];
        profile?: MatchProfile;
      }>(req);
      const extra = parseKeywords(body.q || body.query || '');
      const skillList = Array.isArray(body.skills) ? body.skills : extra;
      profile = {
        skills: [...(body.profile?.skills || skillList || keywords)],
        experience: body.profile?.experience,
        profession: body.profile?.profession,
        hourlyRate: body.profile?.hourlyRate,
      };
      ingested.push(...fromExtensionPayload(body, profile.skills.length ? profile.skills : extra));
    }

    const live = await collectLiveOpportunities(profile.skills.length ? profile.skills : keywords, platform);
    const items = dedupeOpportunities([...ingested, ...live.items]);
    const filtered = (platform !== 'All'
      ? items.filter((item) => item.platform === platform)
      : items).map(withValidUrl).map((item) => {
      const scored = scoreOpportunity(profile, item.title, item.description, item.budget, item.skills);
      return {
        ...item,
        compatibilityScore: scored.complete ? scored.matchScore : 0,
        acceptanceScore: scored.complete ? scored.acceptanceScore : 0,
        skills: scored.matchedSkills.length ? scored.matchedSkills : item.skills,
        onboardingRequired: !scored.complete,
        matchMessage: scored.message,
      };
    });

    return jsonNoStore({
      success: true,
      generatedAt: new Date().toISOString(),
      count: filtered.length,
      items: filtered,
      opportunities: filtered,
      sources: live.sources,
      onboardingRequired: filtered.some((item) => item.onboardingRequired),
    });
  } catch (err: unknown) {
    console.error('Opportunities scan error:', err);
    return jsonNoStore({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch opportunities',
      items: [],
      opportunities: [],
      sources: {},
    }, 500);
  }
}
