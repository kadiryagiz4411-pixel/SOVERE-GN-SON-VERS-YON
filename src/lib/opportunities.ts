export type OpportunityPlatform = 'Fiverr' | 'Upwork' | 'Freelancer' | 'LinkedIn';

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
  clientCountry?: string;
}

export interface OpportunityScanResponse {
  success: boolean;
  generatedAt?: string;
  count?: number;
  items: OpportunityItem[];
  sources?: Record<string, { ok?: boolean; count?: number; note?: string; error?: string }>;
  error?: string;
}

export const OPPORTUNITY_PLATFORMS: Array<'All' | OpportunityPlatform> = [
  'All',
  'Fiverr',
  'Upwork',
  'Freelancer',
  'LinkedIn',
];

export function normalizeOpportunityUrl(url?: string | null): string {
  return String(url || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
}

export function platformSearchUrl(platform: string, query?: string): string {
  const q = encodeURIComponent(String(query || 'developer').trim() || 'developer');
  if (platform === 'Fiverr') return `https://www.fiverr.com/search/gigs?query=${q}`;
  if (platform === 'Freelancer') return `https://www.freelancer.com/search/projects?q=${q}`;
  if (platform === 'LinkedIn') return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
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

export async function fetchLiveOpportunities(opts: {
  query?: string;
  platform?: string;
  signal?: AbortSignal;
} = {}): Promise<OpportunityScanResponse> {
  const params = new URLSearchParams();
  params.set('t', String(Date.now()));
  if (opts.query) params.set('q', opts.query);
  if (opts.platform && opts.platform !== 'All') params.set('platform', opts.platform);

  const response = await fetch(`/api/opportunities?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal: opts.signal,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });

  const data = await response.json().catch(() => ({ success: false, items: [] })) as OpportunityScanResponse & { opportunities?: OpportunityItem[] };
  if (!response.ok) {
    throw new Error(data.error || `Server returned ${response.status}`);
  }
  const rawItems = Array.isArray(data.items) && data.items.length
    ? data.items
    : (Array.isArray(data.opportunities) ? data.opportunities : []);
  const items = rawItems.map((item) => ({
    ...item,
    url: resolveOpportunityHref(item.platform, item.url, item.title),
  }));
  return {
    success: Boolean(data.success),
    generatedAt: data.generatedAt,
    count: items.length,
    items,
    sources: data.sources || {},
    error: data.error,
  };
}
