export type OpportunityPlatform =
  | 'Fiverr'
  | 'Upwork'
  | 'Freelancer'
  | 'LinkedIn'
  | 'We Work Remotely'
  | 'Remote.co'
  | 'Indie Hackers';

export const INDIE_PLATFORMS: OpportunityPlatform[] = [
  'We Work Remotely',
  'Remote.co',
  'Indie Hackers',
];

export function isIndiePlatform(platform: string): boolean {
  return INDIE_PLATFORMS.includes(platform as OpportunityPlatform)
    || platform === 'Remote';
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
  if (u.includes('weworkremotely.com') || fallback === 'We Work Remotely') return 'We Work Remotely';
  if (u.includes('indiehackers.com') || fallback === 'Indie Hackers') return 'Indie Hackers';
  if (
    u.includes('remote.co')
    || u.includes('remoteok.com')
    || u.includes('remotive.com')
    || fallback === 'Remote.co'
    || fallback === 'Remote'
  ) return 'Remote.co';
  const named = String(fallback || '');
  if (
    named === 'Fiverr' || named === 'Upwork' || named === 'Freelancer' || named === 'LinkedIn'
    || named === 'We Work Remotely' || named === 'Remote.co' || named === 'Indie Hackers'
  ) {
    return named;
  }
  return 'Upwork';
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

export function platformOrigin(platform: string): string {
  if (platform === 'Fiverr') return 'https://www.fiverr.com';
  if (platform === 'Freelancer') return 'https://www.freelancer.com';
  if (platform === 'LinkedIn') return 'https://www.linkedin.com';
  if (platform === 'We Work Remotely') return 'https://weworkremotely.com';
  if (platform === 'Indie Hackers') return 'https://www.indiehackers.com';
  if (platform === 'Remote.co' || platform === 'Remote') return 'https://remote.co';
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
      `https://www.upwork.com/ab/feed/jobs/rss?q=${encodeURIComponent(q)}&sort=recency&paging=0%3B20`,
      4500,
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
      4500,
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
  const queries = keywords.slice(0, 3);
  const pages = await Promise.allSettled(
    queries.map((query) => fetchText(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&start=0&f_TPR=r86400`,
      5000,
    )),
  );
  const items: OpportunityItem[] = [];
  for (const page of pages) {
    if (page.status !== 'fulfilled') continue;
    const cards = page.value.split(/base-card|job-search-card/i).slice(1, 21);
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
  }
  return dedupeOpportunities(items.map(withValidUrl));
}

function parseHtmlJobLinks(
  html: string,
  platform: OpportunityPlatform,
  origin: string,
  hrefPattern: RegExp,
  keywords: string[],
): OpportunityItem[] {
  const items: OpportunityItem[] = [];
  const seen = new Set<string>();
  const blocks = html.split(/<a\b/i).slice(1, 80);
  for (const block of blocks) {
    const hrefRaw = ((block.match(/href="([^"]+)"/i) || [])[1] || '').replace(/&amp;/g, '&');
    if (!hrefRaw || !hrefPattern.test(hrefRaw)) continue;
    const href = hrefRaw.startsWith('http') ? hrefRaw.split('?')[0] : `${origin}${hrefRaw.startsWith('/') ? '' : '/'}${hrefRaw.split('?')[0]}`;
    const title = stripHtml(
      (block.match(/<(?:h[1-4]|span|p)[^>]*>([\s\S]*?)<\//i) || [])[1]
      || (block.match(/title="([^"]+)"/i) || [])[1]
      || '',
    );
    if (!title || title.length < 8 || seen.has(href)) continue;
    seen.add(href);
    const snippet = stripHtml(block).slice(0, 400);
    items.push({
      id: makeId(platform, href, title),
      platform,
      title: title.slice(0, 180),
      description: snippet || title,
      budget: extractBudget(snippet),
      postedAt: new Date().toISOString(),
      url: href,
      skills: extractSkills(`${title} ${snippet}`, keywords),
      compatibilityScore: scoreAgainstKeywords(title, snippet, keywords),
    });
  }
  return items;
}

export async function fetchWeWorkRemotely(keywords: string[]): Promise<OpportunityItem[]> {
  const feeds = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    'https://weworkremotely.com/remote-jobs.rss',
  ];
  const pages = await Promise.allSettled(feeds.map((url) => fetchText(url, 5000)));
  const items: OpportunityItem[] = [];
  for (const page of pages) {
    if (page.status !== 'fulfilled') continue;
    for (const entry of parseRssItems(page.value).slice(0, 16)) {
      const description = entry.description.slice(0, 1200);
      items.push({
        id: makeId('We Work Remotely', entry.link, entry.title),
        platform: 'We Work Remotely',
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
  return dedupeOpportunities(items);
}

export async function fetchRemoteCo(keywords: string[]): Promise<OpportunityItem[]> {
  const query = encodeURIComponent(keywords[0] || 'developer');
  const urls = [
    'https://remote.co/remote-jobs/developer/',
    `https://remote.co/remote-jobs/search/?search_keywords=${query}`,
    `https://remotive.com/api/remote-jobs?search=${query}&limit=20`,
    'https://remoteok.com/api',
  ];
  const pages = await Promise.allSettled(urls.map((url) => fetchText(url, 5000, {
    Accept: url.includes('/api') ? 'application/json' : 'text/html,application/xhtml+xml',
  })));
  const items: OpportunityItem[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    if (page.status !== 'fulfilled') continue;
    const raw = page.value;
    if (urls[i].includes('remotive.com/api')) {
      try {
        const parsed = JSON.parse(raw) as { jobs?: Array<{
          id?: number;
          url?: string;
          title?: string;
          description?: string;
          company_name?: string;
          salary?: string;
          publication_date?: string;
          candidate_required_location?: string;
        }> };
        for (const job of (parsed.jobs || []).slice(0, 20)) {
          const title = String(job.title || '').trim();
          const href = String(job.url || '').trim();
          if (!title || !href) continue;
          const description = stripHtml(String(job.description || job.company_name || '')).slice(0, 1200);
          items.push({
            id: makeId('Remote.co', href, title),
            platform: 'Remote.co',
            title,
            description,
            budget: String(job.salary || extractBudget(description)),
            postedAt: toIso(job.publication_date),
            url: href,
            skills: extractSkills(`${title} ${description}`, keywords),
            compatibilityScore: scoreAgainstKeywords(title, description, keywords),
            clientCountry: job.candidate_required_location || undefined,
          });
        }
      } catch { /* ignore malformed remotive payload */ }
      continue;
    }
    if (urls[i].includes('remoteok.com/api')) {
      try {
        const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
        const jobs = Array.isArray(parsed) ? parsed.slice(1, 25) : [];
        for (const job of jobs) {
          const title = String(job.position || job.title || '').trim();
          const href = String(job.url || job.apply_url || '').trim();
          if (!title || !href) continue;
          const description = stripHtml(String(job.description || job.company || '')).slice(0, 1200);
          const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];
          items.push({
            id: makeId('Remote.co', href, title),
            platform: 'Remote.co',
            title,
            description,
            budget: extractBudget(`${job.salary_min || ''} ${job.salary_max || ''} ${description}`),
            postedAt: toIso(Number(job.epoch) || String(job.date || '')),
            url: href,
            skills: tags.length ? tags.slice(0, 6) : extractSkills(`${title} ${description}`, keywords),
            compatibilityScore: scoreAgainstKeywords(title, `${description} ${tags.join(' ')}`, keywords),
            clientCountry: String(job.location || '') || undefined,
          });
        }
      } catch { /* ignore malformed remoteok payload */ }
      continue;
    }
    items.push(...parseHtmlJobLinks(
      raw,
      'Remote.co',
      'https://remote.co',
      /(?:remote\.co)?\/(?:remote-jobs|job)\//i,
      keywords,
    ));
  }
  return dedupeOpportunities(items);
}

export async function fetchIndieHackers(keywords: string[]): Promise<OpportunityItem[]> {
  const html = await fetchText('https://www.indiehackers.com/jobs', 5000);
  return dedupeOpportunities(parseHtmlJobLinks(
    html,
    'Indie Hackers',
    'https://www.indiehackers.com',
    /indiehackers\.com\/job|\/jobs?\/|\/job\//i,
    keywords,
  ));
}

export async function fetchFiverr(keywords: string[]): Promise<OpportunityItem[]> {
  const query = encodeURIComponent(keywords[0] || 'react');
  const urls = [
    `https://www.fiverr.com/search/gigs?query=${query}&source=drop_down_filters`,
    'https://www.fiverr.com/categories/programming-tech',
  ];
  const pages = await Promise.allSettled(urls.map((url) => fetchText(url, 5000)));
  const items: OpportunityItem[] = [];
  for (const page of pages) {
    if (page.status !== 'fulfilled') continue;
    const html = page.value;
    if (/cloudflare|attention required|captcha/i.test(html)) continue;
    const requestLinks = parseHtmlJobLinks(
      html,
      'Fiverr',
      'https://www.fiverr.com',
      /fiverr\.com\/(?:[^"]*request[^"]*|job\/|jobs\/)/i,
      keywords,
    );
    items.push(...requestLinks);
  }
  return dedupeOpportunities(items);
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
): Promise<{ items: OpportunityItem[]; sources: Record<string, SourceStatus> }> {
  const filter = String(platformFilter || 'All');
  const wantAll = !filter || filter === 'All';
  const wantIndie = wantAll || filter === 'Remote' || isIndiePlatform(filter);
  const want = (name: OpportunityPlatform) =>
    wantAll || filter === name || (wantIndie && isIndiePlatform(name));

  const sources: Record<string, SourceStatus> = {
    Fiverr: { ok: true, count: 0, note: 'Fiverr buyer briefs also ingest from the Chrome extension.' },
    Upwork: { ok: false, count: 0 },
    Freelancer: { ok: false, count: 0 },
    LinkedIn: { ok: false, count: 0 },
    'We Work Remotely': { ok: false, count: 0 },
    'Remote.co': { ok: false, count: 0 },
    'Indie Hackers': { ok: false, count: 0 },
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
    tasks.push(fetchFiverr(query).then((rows) => {
      sources.Fiverr = {
        ok: true,
        count: rows.length,
        note: rows.length ? undefined : 'Fiverr buyer briefs ingest from the Chrome extension when the public board is gated.',
      };
      bucket.push(...rows);
    }).catch(() => {
      sources.Fiverr = { ok: true, count: 0, note: 'Fiverr buyer briefs ingest on-demand from the Chrome extension.' };
    }));
  }
  if (want('We Work Remotely')) {
    tasks.push(fetchWeWorkRemotely(query).then((rows) => {
      sources['We Work Remotely'] = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources['We Work Remotely'] = { ok: false, count: 0, error: err instanceof Error ? err.message : 'We Work Remotely feed unavailable' };
    }));
  }
  if (want('Remote.co')) {
    tasks.push(fetchRemoteCo(query).then((rows) => {
      sources['Remote.co'] = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources['Remote.co'] = { ok: false, count: 0, error: err instanceof Error ? err.message : 'Remote.co feed unavailable' };
    }));
  }
  if (want('Indie Hackers')) {
    tasks.push(fetchIndieHackers(query).then((rows) => {
      sources['Indie Hackers'] = { ok: true, count: rows.length };
      bucket.push(...rows);
    }).catch((err: unknown) => {
      sources['Indie Hackers'] = { ok: false, count: 0, error: err instanceof Error ? err.message : 'Indie Hackers board unavailable' };
    }));
  }

  await Promise.all(tasks);
  const items = sortByMatchDesc(dedupeOpportunities(bucket.map(withValidUrl))).slice(0, 80);
  return { items, sources };
}
