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

export interface SourceStatus {
  ok: boolean;
  count: number;
  note?: string;
  error?: string;
}

const DEFAULT_KEYWORDS = ['React', 'Next.js', 'AI', 'Full-stack', 'Python'];
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function parseKeywords(raw?: string): string[] {
  const extra = String(raw || '')
    .split(/[,|/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 12);
  return [...new Set(extra)];
}

export function searchKeywords(raw?: string): string[] {
  const parsed = parseKeywords(raw);
  return parsed.length ? parsed : DEFAULT_KEYWORDS;
}

export function detectPlatform(url: string, fallback?: string): OpportunityPlatform {
  const u = String(url || '').toLowerCase();
  if (u.includes('fiverr.com') || fallback === 'Fiverr') return 'Fiverr';
  if (u.includes('upwork.com') || fallback === 'Upwork') return 'Upwork';
  if (u.includes('freelancer.com') || fallback === 'Freelancer') return 'Freelancer';
  if (u.includes('linkedin.com') || fallback === 'LinkedIn') return 'LinkedIn';
  const named = String(fallback || '');
  if (named === 'Fiverr' || named === 'Upwork' || named === 'Freelancer' || named === 'LinkedIn') {
    return named;
  }
  return 'Upwork';
}

export function platformSearchUrl(platform: string, query?: string): string {
  const q = encodeURIComponent(String(query || 'developer').trim() || 'developer');
  if (platform === 'Fiverr') return `https://www.fiverr.com/search/gigs?query=${q}`;
  if (platform === 'Freelancer') return `https://www.freelancer.com/search/projects?q=${q}`;
  if (platform === 'LinkedIn') return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
  return `https://www.upwork.com/nx/search/jobs/?q=${q}`;
}

export function platformOrigin(platform: string): string {
  if (platform === 'Fiverr') return 'https://www.fiverr.com';
  if (platform === 'Freelancer') return 'https://www.freelancer.com';
  if (platform === 'LinkedIn') return 'https://www.linkedin.com';
  return 'https://www.upwork.com';
}

export function ensureAbsoluteJobUrl(raw: string | undefined | null, platform: string, title?: string): string {
  let value = String(raw || '').trim();
  const markdown = value.match(/\((https?:\/\/[^)\s]+)\)/i);
  if (markdown) value = markdown[1];
  value = value.replace(/^\[|\]$/g, '').replace(/^<|>$/g, '').trim();
  if (/^\/\//.test(value)) value = `https:${value}`;
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, 'https://');
  if (value.startsWith('/') && !value.startsWith('//')) {
    value = `${platformOrigin(platform)}${value}`;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    if (parsed.protocol === 'https:' && parsed.hostname) return parsed.toString();
  } catch {
    // fall through to platform search
  }
  return platformSearchUrl(platform, title);
}

export function withValidUrl(item: OpportunityItem): OpportunityItem {
  return {
    ...item,
    url: ensureAbsoluteJobUrl(item.url, item.platform, item.title),
  };
}

export function normalizeUrl(url: string): string {
  return String(url || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
}

export function makeId(platform: string, url: string, title: string): string {
  const raw = `${platform}|${normalizeUrl(url)}|${title}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  return `${platform.toLowerCase()}-${Math.abs(hash).toString(36)}`;
}

export function dedupeOpportunities(items: OpportunityItem[]): OpportunityItem[] {
  const seen = new Set<string>();
  const out: OpportunityItem[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url) || item.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripHtml(value: string): string {
  return decodeXml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBudget(text: string): string {
  const hourly = text.match(/\$[\d,]+(?:\.\d+)?\s*(?:-|–|to)\s*\$[\d,]+(?:\.\d+)?\s*\/\s*hr/i)
    || text.match(/\$[\d,]+(?:\.\d+)?\s*\/\s*hr/i);
  if (hourly) return hourly[0].replace(/\s+/g, ' ');
  const fixed = text.match(/\$[\d,]+(?:\.\d+)?\s*(?:-|–|to)\s*\$[\d,]+(?:\.\d+)?/i)
    || text.match(/\$[\d,]+(?:\.\d+)?/);
  if (fixed) return `${fixed[0].replace(/\s+/g, ' ')} - Fixed`;
  return '';
}

function extractSkills(text: string, keywords: string[]): string[] {
  const hay = text.toLowerCase();
  const hits = keywords.filter((k) => hay.includes(k.toLowerCase()));
  return hits.slice(0, 6);
}

export function scoreAgainstKeywords(title: string, description: string, keywords: string[]): number {
  const hay = `${title} ${description}`.toLowerCase();
  const unique = [...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2))];
  if (!unique.length) return 0;
  const hits = unique.filter((k) => hay.includes(k.toLowerCase())).length;
  return Math.max(0, Math.min(100, Math.round((hits / unique.length) * 100)));
}

function toIso(value: string | number | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function withCacheBust(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('_t', String(Date.now()));
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchText(url: string, timeoutMs: number, headers: Record<string, string> = {}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(withCacheBust(url), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/rss+xml, application/xml, application/json, text/html;q=0.8, */*;q=0.5',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRssItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocks.map((block) => {
    const title = stripHtml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = stripHtml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1]
      || (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1]
      || '');
    const description = stripHtml((block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '');
    const pubDate = stripHtml((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '');
    return { title, link, description, pubDate };
  }).filter((item) => item.title && item.link);
}

export async function fetchUpwork(keywords: string[]): Promise<OpportunityItem[]> {
  const queries = keywords.slice(0, 5);
  const feeds = await Promise.allSettled(
    queries.map((q) => fetchText(
      `https://www.upwork.com/ab/feed/jobs/rss?q=${encodeURIComponent(q)}&sort=recency&paging=0%3B10`,
      8000,
    )),
  );
  const items: OpportunityItem[] = [];
  let blocked = 0;
  for (const feed of feeds) {
    if (feed.status !== 'fulfilled') {
      blocked += 1;
      continue;
    }
    const xml = feed.value;
    if (/cloudflare|attention required!/i.test(xml) || !/<item/i.test(xml)) {
      blocked += 1;
      continue;
    }
    for (const entry of parseRssItems(xml).slice(0, 8)) {
      const description = entry.description.slice(0, 1200);
      items.push({
        id: makeId('Upwork', entry.link, entry.title),
        platform: 'Upwork',
        title: entry.title,
        description,
        budget: extractBudget(`${entry.title} ${description}`),
        postedAt: toIso(entry.pubDate),
        url: entry.link,
        skills: extractSkills(`${entry.title} ${description}`, keywords),
        compatibilityScore: scoreAgainstKeywords(entry.title, description, keywords),
      });
    }
  }
  const unique = dedupeOpportunities(items);
  if (!unique.length && blocked) {
    throw new Error('Upwork RSS blocked. Open an Upwork job and click Analyze in the extension.');
  }
  return unique;
}

type FreelancerProject = {
  id?: number;
  title?: string;
  preview_description?: string;
  description?: string;
  seo_url?: string;
  type?: string;
  budget?: { minimum?: number; maximum?: number };
  currency?: { sign?: string; code?: string };
  time_submitted?: number;
  jobs?: Array<{ name?: string }>;
  location?: { country?: { name?: string } };
};

export async function fetchFreelancer(keywords: string[]): Promise<OpportunityItem[]> {
  const queries = keywords.slice(0, 3);
  const payloads = await Promise.allSettled(
    queries.map((query) => fetchText(
      `https://www.freelancer.com/api/projects/0.1/projects/active/?limit=10&compact=true&full_description=true&job_details=true&query=${encodeURIComponent(query)}`,
      8000,
      { Accept: 'application/json' },
    )),
  );
  const projects: FreelancerProject[] = [];
  for (const payload of payloads) {
    if (payload.status !== 'fulfilled') continue;
    try {
      const parsed = JSON.parse(payload.value) as { result?: { projects?: FreelancerProject[] } };
      projects.push(...(parsed.result?.projects || []));
    } catch {
      // ignore a single malformed page
    }
  }
  if (!projects.length) {
    throw new Error('Freelancer API returned no active projects');
  }

  return dedupeOpportunities(projects.slice(0, 24).map((project) => {
    const title = String(project.title || 'Freelancer project');
    const description = stripHtml(String(project.description || project.preview_description || '')).slice(0, 1200);
    const href = project.seo_url
      ? `https://www.freelancer.com/projects/${project.seo_url}`
      : `https://www.freelancer.com/projects/${project.id || ''}`;
    const sign = project.currency?.sign || '$';
    const min = project.budget?.minimum;
    const max = project.budget?.maximum;
    const type = String(project.type || '').toLowerCase() === 'hourly' ? '/hr' : ' - Fixed';
    let budget = '';
    if (min && max) budget = `${sign}${min} - ${sign}${max}${type}`;
    else if (max) budget = `${sign}${max}${type}`;
    const skills = (project.jobs || []).map((job) => String(job.name || '')).filter(Boolean).slice(0, 6);
    return {
      id: makeId('Freelancer', href, title),
      platform: 'Freelancer' as const,
      title,
      description,
      budget,
      postedAt: toIso(project.time_submitted),
      url: href,
      skills: skills.length ? skills : extractSkills(`${title} ${description}`, keywords),
      compatibilityScore: scoreAgainstKeywords(title, description, keywords),
      clientCountry: project.location?.country?.name,
    };
  }));
}

export async function fetchLinkedIn(keywords: string[]): Promise<OpportunityItem[]> {
  const query = keywords[0] || 'React';
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&start=0&f_TPR=r86400`;
  const html = await fetchText(url, 8000);
  const cards = html.split(/base-card|job-search-card/i).slice(1, 21);
  const items: OpportunityItem[] = [];
  for (const card of cards) {
    const href = ((card.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/i) || [])[1] || '')
      .replace(/&amp;/g, '&');
    const title = stripHtml((card.match(/base-search-card__title[^>]*>([\s\S]*?)<\//i) || [])[1] || '');
    const company = stripHtml((card.match(/base-search-card__subtitle[^>]*>([\s\S]*?)<\//i) || [])[1] || '');
    const location = stripHtml((card.match(/job-search-card__location[^>]*>([\s\S]*?)<\//i) || [])[1] || '');
    const listed = stripHtml((card.match(/datetime="([^"]+)"/i) || [])[1] || '');
    if (!href || !title) continue;
    const description = [company, location].filter(Boolean).join(' · ');
    items.push({
      id: makeId('LinkedIn', href, title),
      platform: 'LinkedIn',
      title,
      description: description || title,
      budget: '',
      postedAt: toIso(listed),
      url: href.split('?')[0],
      skills: extractSkills(`${title} ${description}`, keywords),
      compatibilityScore: scoreAgainstKeywords(title, description, keywords),
      clientCountry: location || undefined,
    });
  }
  return dedupeOpportunities(items.map(withValidUrl));
}

export async function fetchFiverr(): Promise<OpportunityItem[]> {
  // Buyer requests are behind seller auth. Live Fiverr briefs arrive via the
  // Chrome extension POST ingest on click — never fabricate gigs as jobs.
  return [];
}

export function fromExtensionPayload(body: {
  items?: Array<Partial<OpportunityItem> & { job_title?: string; job_url?: string; job_description?: string }>;
  pageText?: string;
  pageTitle?: string;
  pageUrl?: string;
  platform?: string;
}, keywords: string[]): OpportunityItem[] {
  const pushed = Array.isArray(body.items) ? body.items : [];
  const items: OpportunityItem[] = [];

  for (const raw of pushed) {
    const url = String(raw.url || raw.job_url || body.pageUrl || '').trim();
    const title = String(raw.title || raw.job_title || body.pageTitle || '').trim();
    if (!url && !title) continue;
    const platform = detectPlatform(url, raw.platform || body.platform);
    const description = String(raw.description || raw.job_description || body.pageText || '').slice(0, 1200);
    items.push({
      id: String(raw.id || makeId(platform, url, title)),
      platform,
      title: title || `${platform} opportunity`,
      description,
      budget: String(raw.budget || extractBudget(description)),
      postedAt: String(raw.postedAt || new Date().toISOString()),
      url: url || `https://www.${platform.toLowerCase()}.com`,
      skills: Array.isArray(raw.skills) && raw.skills.length ? raw.skills.map(String).slice(0, 6) : extractSkills(`${title} ${description}`, keywords),
      compatibilityScore: Number(raw.compatibilityScore) || scoreAgainstKeywords(title, description, keywords),
      clientCountry: raw.clientCountry ? String(raw.clientCountry) : undefined,
    });
  }

  if (!items.length && (body.pageUrl || body.pageTitle || body.pageText)) {
    const url = String(body.pageUrl || '').trim();
    const title = String(body.pageTitle || 'Job posting').trim();
    const description = String(body.pageText || '').slice(0, 1200);
    const platform = detectPlatform(url, body.platform);
    items.push({
      id: makeId(platform, url, title),
      platform,
      title,
      description,
      budget: extractBudget(description),
      postedAt: new Date().toISOString(),
      url,
      skills: extractSkills(`${title} ${description}`, keywords),
      compatibilityScore: scoreAgainstKeywords(title, description, keywords),
    });
  }

  return dedupeOpportunities(items.map(withValidUrl));
}

export async function collectLiveOpportunities(
  keywords: string[],
  platformFilter?: string,
): Promise<{ items: OpportunityItem[]; sources: Record<OpportunityPlatform, SourceStatus> }> {
  const want = (name: OpportunityPlatform) =>
    !platformFilter || platformFilter === 'All' || platformFilter === name;

  const sources: Record<OpportunityPlatform, SourceStatus> = {
    Fiverr: { ok: true, count: 0, note: 'Fiverr buyer briefs ingest on-demand from the Chrome extension.' },
    Upwork: { ok: false, count: 0 },
    Freelancer: { ok: false, count: 0 },
    LinkedIn: { ok: false, count: 0 },
  };

  const tasks: Array<Promise<void>> = [];
  const bucket: OpportunityItem[] = [];
  const query = keywords.length ? keywords : searchKeywords('');

  if (want('Upwork')) {
    tasks.push(fetchUpwork(query).then((rows) => {
      sources.Upwork = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources.Upwork = { ok: false, count: 0, error: err instanceof Error ? err.message : 'Upwork feed unavailable' };
    }));
  }
  if (want('Freelancer')) {
    tasks.push(fetchFreelancer(query).then((rows) => {
      sources.Freelancer = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources.Freelancer = { ok: false, count: 0, error: err instanceof Error ? err.message : 'Freelancer API unavailable' };
    }));
  }
  if (want('LinkedIn')) {
    tasks.push(fetchLinkedIn(query).then((rows) => {
      sources.LinkedIn = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources.LinkedIn = {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : 'LinkedIn guest feed unavailable',
        note: 'Use Analyze Active Page on a LinkedIn job to ingest it.',
      };
    }));
  }
  if (want('Fiverr')) {
    tasks.push(fetchFiverr().then((rows) => {
      sources.Fiverr.count = rows.length;
      bucket.push(...rows);
    }).catch(() => {
      sources.Fiverr = { ok: true, count: 0, note: 'Fiverr buyer briefs ingest on-demand from the Chrome extension.' };
    }));
  }

  await Promise.all(tasks);
  const items = dedupeOpportunities(bucket.map(withValidUrl))
    .sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)))
    .slice(0, 40);
  return { items, sources };
}
