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
      'Cache-Control': 'no-cache',
    },
  });

  const data = await response.json().catch(() => ({ success: false, items: [] })) as OpportunityScanResponse & { opportunities?: OpportunityItem[] };
  if (!response.ok) {
    throw new Error(data.error || `Server returned ${response.status}`);
  }
  const items = Array.isArray(data.items) && data.items.length
    ? data.items
    : (Array.isArray(data.opportunities) ? data.opportunities : []);
  return {
    success: Boolean(data.success),
    generatedAt: data.generatedAt,
    count: items.length,
    items,
    sources: data.sources || {},
    error: data.error,
  };
}
