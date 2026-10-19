import { jsonNoStore, preflightNoStore, readJsonBody } from './_lib/cors';
import {
  collectLiveOpportunities,
  dedupeOpportunities,
  fromExtensionPayload,
  parseKeywords,
  withValidUrl,
  type OpportunityItem,
  type OpportunityPlatform,
} from './_lib/opportunitySources';

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

    if (req.method === 'POST') {
      const body = await readJsonBody<{
        items?: OpportunityItem[];
        pageText?: string;
        pageTitle?: string;
        pageUrl?: string;
        platform?: string;
        q?: string;
        query?: string;
      }>(req);
      const extra = parseKeywords(body.q || body.query || '');
      ingested.push(...fromExtensionPayload(body, extra.length ? extra : keywords));
    }

    const live = await collectLiveOpportunities(keywords, platform);
    const items = dedupeOpportunities([...ingested, ...live.items]);
    const filtered = (platform !== 'All'
      ? items.filter((item) => item.platform === platform)
      : items).map(withValidUrl);

    return jsonNoStore({
      success: true,
      generatedAt: new Date().toISOString(),
      count: filtered.length,
      items: filtered,
      opportunities: filtered,
      sources: live.sources,
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
