import { jsonNoStore, preflightNoStore, readJsonBody } from './_lib/cors.js';
import { exposeApi } from './_lib/http.js';
import { firstEnv } from './_lib/env.js';
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
export const config = { runtime: 'nodejs', maxDuration: 25 };

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function normalizeQueueUrl(url: string): string {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
}

async function persistIngestedJobs(req: Request, items: OpportunityItem[]): Promise<void> {
  if (!items.length) return;
  const token = bearerToken(req);
  if (!token) return;
  const supabaseUrl = firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const anon = firstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !anon) return;

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!userRes.ok) return;
    const user = await userRes.json().catch(() => ({})) as { id?: string };
    const userId = String(user.id || '');
    if (!userId) return;

    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/apply_queue?select=job_url&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=80`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
          Accept: 'application/json',
        },
      },
    );
    const existingRows = existingRes.ok ? await existingRes.json().catch(() => []) : [];
    const existing = new Set(
      (Array.isArray(existingRows) ? existingRows : []).map((row: { job_url?: string }) => normalizeQueueUrl(String(row.job_url || ''))),
    );

    const batchId = crypto.randomUUID();
    const rows = items
      .filter((item) => {
        const url = normalizeQueueUrl(item.url);
        return url && !existing.has(url);
      })
      .map((item) => {
        const scored = scoreOpportunity(
          { skills: item.skills || [] },
          item.title,
          item.description,
          item.budget,
          item.skills,
        );
        const score = Number(item.compatibilityScore) || (scored.complete ? scored.matchScore : 0);
        return {
          user_id: userId,
          batch_id: batchId,
          job_title: String(item.title || 'Job').slice(0, 200),
          company: item.clientCountry ? `${item.platform} · ${item.clientCountry}` : item.platform,
          platform: item.platform,
          budget: item.budget || '',
          job_url: item.url,
          job_description: String(item.description || '').slice(0, 8000),
          match_score: score,
          acceptance_probability: Number((item as { acceptanceScore?: number }).acceptanceScore) || (scored.complete ? scored.acceptanceScore : 0),
          match_reasoning: scored.complete
            ? [
                scored.matchedSkills.length
                  ? `Matched skills: ${scored.matchedSkills.slice(0, 4).join(', ')}`
                  : 'Limited overlap with your onboarding skills',
              ]
            : [scored.message || 'Complete onboarding to calculate match scores'],
          generated_proposal: '',
          skills_matched: scored.matchedSkills.length ? scored.matchedSkills : (item.skills || []),
          competition_level: score >= 80 ? 'low' : score >= 45 ? 'medium' : 'high',
          client_quality_score: score,
          urgency: 'medium',
          status: 'pending',
        };
      });

    if (!rows.length) return;
    await fetch(`${supabaseUrl}/rest/v1/apply_queue`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch {
    /* Apply Queue persist is best-effort; never fail the live scan. */
  }
}

function platformParam(raw: string | null): OpportunityPlatform | 'All' {
  const value = String(raw || '').trim();
  if (!value || value.toLowerCase() === 'all') return 'All';
  if (value === 'Fiverr' || value === 'Upwork' || value === 'Freelancer' || value === 'LinkedIn') return value;
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  if (titled === 'Fiverr' || titled === 'Upwork' || titled === 'Freelancer' || titled === 'LinkedIn') return titled;
  return 'All';
}

async function handleRequest(req: Request): Promise<Response> {
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
    const ingestedUrls = new Set(ingested.map((item) => String(item.url || '').trim()).filter(Boolean));
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

    if (req.method === 'POST' && ingestedUrls.size) {
      await persistIngestedJobs(
        req,
        filtered.filter((item) => ingestedUrls.has(String(item.url || '').trim())),
      );
    }

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

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
