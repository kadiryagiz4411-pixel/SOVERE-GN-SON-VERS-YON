const HIRING_MARKS = /hiring|looking for|we need|seeking|apply now|urgent|immediate start|decision maker|recruiter/i;
const HANDLE_RE = /(?:^|[^\w])@([a-z0-9._-]{3,32})/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const COMPANY_RE = /(?:at|for|with|company:?|client:?)\s+([A-Z][\w&.\- ]{2,48})/;

export const POACH_JOB_KEY = 'sovereign.poach.job';

export type PoachTarget = {
  active: boolean;
  company: string;
  domain: string;
  recruiter: string;
  platform: 'Upwork' | 'LinkedIn' | 'Fiverr' | '';
  signals: string[];
};

export type PoachJobBag = {
  title?: string;
  text: string;
  url?: string;
};

function platformFromBlob(blob: string): PoachTarget['platform'] {
  if (/upwork/.test(blob)) return 'Upwork';
  if (/linkedin/.test(blob)) return 'LinkedIn';
  if (/fiverr/.test(blob)) return 'Fiverr';
  return '';
}

function domainFrom(company: string, url: string, emails: string[]): string {
  const host = (() => {
    try {
      return url ? new URL(url).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  })();
  if (host && !/upwork|linkedin|fiverr|indeed|glassdoor/.test(host)) return host;
  const mailHost = emails.map((email) => email.split('@')[1] || '').find((item) => item && !/gmail|yahoo|outlook|hotmail|icloud/.test(item));
  if (mailHost) return mailHost;
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return slug ? `${slug}.com` : '';
}

export function inspectHiringTarget(input: {
  title?: string;
  text?: string;
  url?: string;
  html?: string;
} = {}): PoachTarget {
  const title = String(input.title || '').trim();
  const text = String(input.text || input.html || '').replace(/\s+/g, ' ').trim();
  const url = String(input.url || '').trim();
  const blob = `${title}\n${text}\n${url}`.toLowerCase();
  const platform = platformFromBlob(blob);
  const emails = Array.from(text.match(EMAIL_RE) || []).slice(0, 3);
  const handles = Array.from(text.matchAll(HANDLE_RE)).map((hit) => `@${hit[1]}`).slice(0, 3);
  const companyHit = title.match(COMPANY_RE) || text.match(COMPANY_RE);
  const company = String(companyHit?.[1] || title.split(/[-–|·•]/)[0] || '').replace(/\s+/g, ' ').trim().slice(0, 64);
  const recruiter = handles[0] || emails[0] || '';
  const signals = [
    HIRING_MARKS.test(blob) ? 'Active hire language' : '',
    platform ? `${platform} listing` : '',
    text.length > 160 ? 'Full brief on screen' : '',
    recruiter ? 'Public contact in DOM' : '',
  ].filter(Boolean);
  const active = signals.length >= 2 || (Boolean(platform) && text.length > 80);
  return {
    active,
    company,
    domain: domainFrom(company, url, emails),
    recruiter,
    platform,
    signals,
  };
}

export function stashPoachJob(job: PoachJobBag): void {
  try {
    const text = String(job.text || '').trim();
    if (text.length < 20) return;
    sessionStorage.setItem(POACH_JOB_KEY, JSON.stringify({
      title: String(job.title || '').trim(),
      text,
      url: String(job.url || '').trim(),
    }));
  } catch {
    /* private mode */
  }
}

export function takePoachJob(): PoachJobBag | null {
  try {
    const raw = sessionStorage.getItem(POACH_JOB_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POACH_JOB_KEY);
    const bag = JSON.parse(raw) as PoachJobBag;
    if (!bag?.text || String(bag.text).trim().length < 20) return null;
    return bag;
  } catch {
    return null;
  }
}
