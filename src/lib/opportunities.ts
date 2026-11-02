export type OpportunityPlatform =
  | 'Fiverr'
  | 'Upwork'
  | 'Freelancer'
  | 'LinkedIn'
  | 'We Work Remotely'
  | 'Remote.co'
  | 'Indie Hackers';

export type OpportunityFilter = 'All' | 'Remote' | OpportunityPlatform;

export const INDIE_PLATFORMS: OpportunityPlatform[] = [
  'We Work Remotely',
  'Remote.co',
  'Indie Hackers',
];

export function isIndiePlatform(platform: string): boolean {
  return INDIE_PLATFORMS.includes(platform as OpportunityPlatform) || platform === 'Remote';
}

export interface OpportunityItem {
  id: string;
  platform: OpportunityPlatform;
  title: string;
  description: string;
  budget: string;
  postedAt: string;
  url: string;
  skills: string[];
  compatibilityScore?: number;
  matchScore?: number;
  matchPercentage?: number;
  clientCountry?: string;
}

export interface OpportunityScanResponse {
  success: boolean;
  generatedAt?: string;
  count?: number;
  items: OpportunityItem[];
  sources?: Record<string, { ok?: boolean; count?: number; note?: string; error?: string }>;
  persisted?: number;
  error?: string;
}

export const OPPORTUNITY_PLATFORMS: Array<OpportunityFilter> = [
  'All',
  'Fiverr',
  'Upwork',
  'Freelancer',
  'LinkedIn',
  'Remote',
];

export function normalizeOpportunityUrl(url?: string | null): string {
  return String(url || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
}

export function platformSearchUrl(platform: string, query?: string): string {
  const q = encodeURIComponent(String(query || 'developer').trim() || 'developer');
  if (platform === 'Fiverr') return `https://www.fiverr.com/search/gigs?query=${q}`;
  if (platform === 'Freelancer') return `https://www.freelancer.com/search/projects?q=${q}`;
  if (platform === 'LinkedIn') return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
  if (platform === 'We Work Remotely') return `https://weworkremotely.com/remote-jobs/search?term=${q}`;
  if (platform === 'Indie Hackers') return `https://www.indiehackers.com/jobs?q=${q}`;
  if (platform === 'Remote.co' || platform === 'Remote') return `https://remote.co/remote-jobs/search/?search_keywords=${q}`;
  return `https://www.upwork.com/nx/search/jobs/?q=${q}`;
}

export function resolveOpportunityHref(platform: string, rawUrl?: string | null, title?: string): string {
  let value = String(rawUrl || '').trim();
  const markdown = value.match(/\((https?:\/\/[^)\s]+)\)/i);
  if (markdown) value = markdown[1];
  value = value.replace(/^\[|\]$/g, '').replace(/^<|>$/g, '').trim();
  if (/^\/\//.test(value)) value = `https:${value}`;
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, 'https://');
  if (value.startsWith('/') && !value.startsWith('//')) {
    const origin = platform === 'Fiverr' ? 'https://www.fiverr.com'
      : platform === 'Freelancer' ? 'https://www.freelancer.com'
        : platform === 'LinkedIn' ? 'https://www.linkedin.com'
          : platform === 'We Work Remotely' ? 'https://weworkremotely.com'
            : platform === 'Indie Hackers' ? 'https://www.indiehackers.com'
              : platform === 'Remote.co' || platform === 'Remote' ? 'https://remote.co'
                : 'https://www.upwork.com';
    value = `${origin}${value}`;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    if (parsed.protocol === 'https:' && parsed.hostname) return parsed.toString();
  } catch {
    // use platform search
  }
  return platformSearchUrl(platform, title);
}

export function opportunityMatchScore(item: {
  compatibilityScore?: number;
  matchScore?: number;
  match_score?: number;
  matchPercentage?: number;
}): number {
  const raw = Number(
    item.compatibilityScore
    ?? item.matchScore
    ?? item.match_score
    ?? item.matchPercentage
    ?? 0,
  );
  return Number.isFinite(raw) ? raw : 0;
}

export function sortByMatchDesc<T extends {
  compatibilityScore?: number;
  matchScore?: number;
  match_score?: number;
  matchPercentage?: number;
}>(items: T[]): T[] {
  return [...items].sort((a, b) => opportunityMatchScore(b) - opportunityMatchScore(a));
}

export async function fetchLiveOpportunities(opts: {
  query?: string;
  platform?: string;
  signal?: AbortSignal;
  accessToken?: string;
  skills?: string[];
  profile?: {
    skills?: string[];
    experience?: string;
    profession?: string;
    hourlyRate?: number | null;
  };
  persist?: boolean;
} = {}): Promise<OpportunityScanResponse> {
  try {
    const params = new URLSearchParams();
    params.set('t', String(Date.now()));
    if (opts.query) params.set('q', opts.query);
    if (opts.platform && opts.platform !== 'All') params.set('platform', opts.platform);

    const persist = Boolean(opts.persist && opts.accessToken);
    const response = await fetch(`/api/opportunities?${params.toString()}`, {
      method: persist || opts.profile || opts.skills?.length ? 'POST' : 'GET',
      cache: 'no-store',
      signal: opts.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
      },
      body: persist || opts.profile || opts.skills?.length
        ? JSON.stringify({
          q: opts.query,
          query: opts.query,
          platform: opts.platform || 'All',
          skills: opts.skills,
          profile: opts.profile,
          refill: persist,
        })
        : undefined,
    });

    const data = await response.json().catch(() => ({ success: false, items: [] })) as OpportunityScanResponse & { opportunities?: OpportunityItem[] };
    if (!response.ok) {
      console.warn('[opportunities] scan skipped', data.error || response.status);
      return {
        success: false,
        items: [],
        count: 0,
        sources: data.sources || {},
        persisted: 0,
        error: data.error,
      };
    }
    const rawItems = Array.isArray(data.items) && data.items.length
      ? data.items
      : (Array.isArray(data.opportunities) ? data.opportunities : []);
    const items = sortByMatchDesc(rawItems.map((item) => ({
      ...item,
      url: resolveOpportunityHref(item.platform, item.url, item.title),
    })));
    return {
      success: Boolean(data.success),
      generatedAt: data.generatedAt,
      count: items.length,
      items,
      sources: data.sources || {},
      persisted: Number(data.persisted || 0),
      error: data.error,
    };
  } catch (err) {
    console.warn('[opportunities] scan failed', err);
    return { success: false, items: [], count: 0, sources: {}, persisted: 0 };
  }
}
